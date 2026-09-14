import sqlite3
import subprocess
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pandas as pd

import email_report as report


ROOT = Path(__file__).resolve().parents[1]


def _db():
    conn = sqlite3.connect(":memory:")
    conn.execute(
        """CREATE TABLE article_image (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_url TEXT,
            source TEXT,
            fetched_at TIMESTAMP
        )"""
    )
    conn.commit()
    report.ensure_sent_table(conn)
    return conn


def _cfg(tmp: Path) -> report.AppConfig:
    (tmp / "templates").mkdir(exist_ok=True)
    (tmp / "queries").mkdir(exist_ok=True)
    (tmp / "templates" / "carta_morning.html").write_text(
        (ROOT / "templates" / "carta_morning.html").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    (tmp / "queries" / "carta_idle.sql").write_text(
        (ROOT / "queries" / "carta_idle.sql").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    (tmp / "queries" / "carta_report.sql").write_text(
        (ROOT / "queries" / "carta_report.sql").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    path = tmp / "config.toml"
    path.write_text(
        """
[email]
smtp_host = "localhost"
from_addr = "a@b.c"
to = ["one@test.it", "two@test.it"]
cc = ["cc@test.it"]
template_path = "templates/carta_morning.html"

[report]
timezone = "Europe/Rome"
after_hour = 12
idle_hours = 2
source = "carta"
median_days = 14
idle_query_path = "queries/carta_idle.sql"
report_query_path = "queries/carta_report.sql"
""",
        encoding="utf-8",
    )
    return report.load_config(path)


class TestEmailReport(unittest.TestCase):
    def setUp(self):
        self.conn = _db()
        self.tmp = tempfile.TemporaryDirectory()
        self.cfg = _cfg(Path(self.tmp.name))
        self.tz = ZoneInfo("Europe/Rome")

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def _insert(self, url, fetched_at, source="carta"):
        self.conn.execute(
            "INSERT INTO article_image (article_url, source, fetched_at) VALUES (?, ?, ?)",
            (url, source, fetched_at),
        )
        self.conn.commit()

    def test_skip_before_noon(self):
        now = datetime(2026, 9, 14, 11, 30, tzinfo=self.tz)
        self.assertFalse(report.should_send_report(self.conn, self.cfg, now=now))

    def test_skip_if_carta_in_last_two_hours(self):
        now = datetime(2026, 9, 14, 13, 0, tzinfo=self.tz)
        self._insert("https://www.example.it/a", "2026-09-14 12:10:00")
        self.assertFalse(report.should_send_report(self.conn, self.cfg, now=now))

    def test_send_after_noon_when_idle(self):
        now = datetime(2026, 9, 14, 13, 0, tzinfo=self.tz)
        self._insert("https://www.example.it/a", "2026-09-14 10:00:00")
        self.assertTrue(report.should_send_report(self.conn, self.cfg, now=now))

    def test_skip_if_already_sent(self):
        now = datetime(2026, 9, 14, 14, 0, tzinfo=self.tz)
        report.mark_sent(self.conn, datetime(2026, 9, 14, 13, 0))
        self.assertFalse(report.should_send_report(self.conn, self.cfg, now=now))

    def test_domain_table_median_and_delta(self):
        for i in range(3):
            self._insert(f"https://www.example.it/oggi-{i}", "2026-09-14 09:00:00")
        self._insert("https://www.other.it/oggi", "2026-09-14 09:30:00")
        for day, n in (("11", 2), ("12", 4), ("13", 6)):
            for i in range(n):
                self._insert(f"https://www.example.it/{day}-{i}", f"2026-09-{day} 09:00:00")

        now = datetime(2026, 9, 14, 13, 0, tzinfo=self.tz)
        table = report.build_domain_table(self.conn, self.cfg, now=now)
        by_domain = table.set_index("dominio")

        self.assertEqual(int(by_domain.loc["example.it", "import"]), 3)
        self.assertEqual(float(by_domain.loc["example.it", "mediana"]), 4.0)
        self.assertEqual(float(by_domain.loc["example.it", "delta"]), -1.0)
        self.assertEqual(int(by_domain.loc["other.it", "import"]), 1)
        self.assertTrue(pd.isna(by_domain.loc["other.it", "mediana"]))

    def test_template_placeholder(self):
        html = report.render_message(
            "Ciao\n%tabella%\nTotale %totale% il %data%",
            "<table/>",
            "2026-09-14",
            9,
        )
        self.assertIn("<table/>", html)
        self.assertIn("9", html)
        self.assertIn("2026-09-14", html)
        self.assertNotIn("%tabella%", html)

    def test_load_config_and_recipients(self):
        self.assertEqual(self.cfg.email.to, ["one@test.it", "two@test.it"])
        self.assertEqual(
            report.all_recipients(self.cfg.email),
            ["one@test.it", "two@test.it", "cc@test.it"],
        )
        self.assertEqual(self.cfg.report.after_hour, 12)

    def test_send_to_all_recipients_once(self):
        now = datetime(2026, 9, 14, 13, 5, tzinfo=self.tz)
        self._insert("https://www.lanazione.it/a", "2026-09-14 09:00:00")
        sent = {}

        orig = report.send_email

        def fake_send(email_cfg, subject, html_body, text_body, dry_run=False):
            sent["to"] = report.all_recipients(email_cfg)
            sent["text"] = text_body
            sent["html"] = html_body
            sent["subject"] = subject

        report.send_email = fake_send
        try:
            ok = report.maybe_send_morning_report(
                self.conn, Path(self.tmp.name) / "config.toml", now=now
            )
        finally:
            report.send_email = orig
        self.assertTrue(ok)
        self.assertEqual(sent["to"], ["one@test.it", "two@test.it", "cc@test.it"])
        self.assertIn("lanazione.it", sent["text"])
        self.assertNotIn("%tabella%", sent["text"])
        self.assertTrue(report.already_sent_today(self.conn, "2026-09-14"))

    def test_sendmail_invokes_local_mta(self):
        cfg = self.cfg.email
        cfg.method = "sendmail"
        cfg.sendmail_path = "/usr/sbin/sendmail"
        cfg.from_addr = "from@test.it"
        captured = {}

        def fake_run(cmd, input=None, capture_output=None, timeout=None):
            captured["cmd"] = cmd
            captured["input"] = input
            return subprocess.CompletedProcess(cmd, 0, b"", b"")

        with patch.object(report.Path, "is_file", return_value=True), patch(
            "email_report.subprocess.run", side_effect=fake_run
        ):
            report.send_email(cfg, "subj", "<p>hi</p>", "hi")

        self.assertEqual(captured["cmd"][0], "/usr/sbin/sendmail")
        self.assertIn("-f", captured["cmd"])
        self.assertIn("one@test.it", captured["cmd"])
        self.assertIn("two@test.it", captured["cmd"])
        self.assertIn("cc@test.it", captured["cmd"])
        self.assertIn(b"subj", captured["input"])


if __name__ == "__main__":
    unittest.main()
