import logging
import os
import smtplib
import sqlite3
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from pathlib import Path
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import pandas as pd

try:
    from tomllib import load as load_toml
except ImportError:  # Python < 3.11
    from tomli import load as load_toml  # type: ignore

logger = logging.getLogger(__name__)

TABLE_SENT = "carta_report_sent"
REPORT_TYPE = "morning_carta"
ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = ROOT / "config.toml"


@dataclass
class EmailConfig:
    method: str = "sendmail"
    smtp_host: str = ""
    smtp_port: int = 587
    use_tls: bool = True
    smtp_user: str = ""
    smtp_password: str = ""
    sendmail_path: str = "/usr/sbin/sendmail"
    from_addr: str = ""
    to: list[str] = field(default_factory=list)
    cc: list[str] = field(default_factory=list)
    bcc: list[str] = field(default_factory=list)
    subject: str = "Report import carta — %data%"
    template_path: str = "templates/carta_morning.html"
    dashboard_url: str = "https://dashboard.robinweb.it/"


@dataclass
class ReportConfig:
    timezone: str = "Europe/Rome"
    after_hour: int = 12
    idle_hours: int = 2
    source: str = "carta"
    median_days: int = 14
    idle_query_path: str = "queries/carta_idle.sql"
    report_query_path: str = "queries/carta_report.sql"


@dataclass
class AppConfig:
    email: EmailConfig
    report: ReportConfig
    config_dir: Path


def _as_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return [str(item).strip() for item in value if str(item).strip()]


def load_config(path: str | Path | None = None) -> AppConfig:
    config_path = Path(path or os.getenv("REPORT_CONFIG") or DEFAULT_CONFIG)
    if not config_path.is_file():
        raise FileNotFoundError(
            f"Config report non trovato: {config_path}. "
            "Copia config.example.toml in config.toml"
        )

    with config_path.open("rb") as fh:
        raw = load_toml(fh)

    email_raw = raw.get("email", {})
    report_raw = raw.get("report", {})
    password_env = email_raw.get("smtp_password_env", "SMTP_PASSWORD")
    password = os.getenv(password_env, email_raw.get("smtp_password", "") or "")

    email = EmailConfig(
        method=str(email_raw.get("method", "sendmail")).lower(),
        smtp_host=email_raw.get("smtp_host", ""),
        smtp_port=int(email_raw.get("smtp_port", 587)),
        use_tls=bool(email_raw.get("use_tls", True)),
        smtp_user=email_raw.get("smtp_user", ""),
        smtp_password=password,
        sendmail_path=email_raw.get("sendmail_path", "/usr/sbin/sendmail"),
        from_addr=email_raw.get("from_addr", ""),
        to=_as_list(email_raw.get("to")),
        cc=_as_list(email_raw.get("cc")),
        bcc=_as_list(email_raw.get("bcc")),
        subject=email_raw.get("subject", "Report import carta — %data%"),
        template_path=email_raw.get("template_path", "templates/carta_morning.html"),
        dashboard_url=email_raw.get("dashboard_url", "https://dashboard.robinweb.it/"),
    )
    report = ReportConfig(
        timezone=report_raw.get("timezone", "Europe/Rome"),
        after_hour=int(report_raw.get("after_hour", 12)),
        idle_hours=int(report_raw.get("idle_hours", 2)),
        source=report_raw.get("source", "carta"),
        median_days=int(report_raw.get("median_days", 14)),
        idle_query_path=report_raw.get("idle_query_path", "queries/carta_idle.sql"),
        report_query_path=report_raw.get("report_query_path", "queries/carta_report.sql"),
    )
    return AppConfig(email=email, report=report, config_dir=config_path.parent)


def now_in_tz(tz_name: str, now: datetime | None = None) -> datetime:
    tz = ZoneInfo(tz_name)
    if now is None:
        return datetime.now(tz)
    if now.tzinfo is None:
        return now.replace(tzinfo=tz)
    return now.astimezone(tz)


def ensure_sent_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        f"""CREATE TABLE IF NOT EXISTS {TABLE_SENT} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_type TEXT NOT NULL,
        day TEXT NOT NULL,
        sent_at TIMESTAMP NOT NULL,
        UNIQUE(report_type, day)
        )"""
    )
    conn.commit()


def _resolve(cfg: AppConfig, relative: str) -> Path:
    path = Path(relative)
    if not path.is_absolute():
        path = cfg.config_dir / path
    return path


def load_sql(cfg: AppConfig, relative: str, **placeholders) -> str:
    sql = _resolve(cfg, relative).read_text(encoding="utf-8")
    for key, value in placeholders.items():
        sql = sql.replace("{{" + key + "}}", str(value))
    return sql


def carta_count_idle(conn: sqlite3.Connection, cfg: AppConfig, now: datetime) -> int:
    sql = load_sql(
        cfg,
        cfg.report.idle_query_path,
        source=cfg.report.source,
        now=now.strftime("%Y-%m-%d %H:%M:%S"),
        idle_hours=cfg.report.idle_hours,
    )
    row = pd.read_sql(sql, conn)
    return int(row.iloc[0]["n"])


def already_sent_today(conn: sqlite3.Connection, today: str) -> bool:
    ensure_sent_table(conn)
    sql = f"""
        SELECT 1
        FROM {TABLE_SENT}
        WHERE report_type = ?
          AND day = ?
        LIMIT 1
    """
    row = pd.read_sql(sql, conn, params=(REPORT_TYPE, today))
    return not row.empty


def mark_sent(conn: sqlite3.Connection, when: datetime, commit: bool = True) -> None:
    ensure_sent_table(conn)
    conn.execute(
        f"""INSERT OR IGNORE INTO {TABLE_SENT} (report_type, day, sent_at)
           VALUES (?, ?, ?)""",
        (REPORT_TYPE, when.strftime("%Y-%m-%d"), when.strftime("%Y-%m-%d %H:%M:%S")),
    )
    if commit:
        conn.commit()


def should_send_report(
    conn: sqlite3.Connection,
    cfg: AppConfig,
    now: datetime | None = None,
    force: bool = False,
) -> bool:
    current = now_in_tz(cfg.report.timezone, now)
    if force:
        return True
    if current.hour < cfg.report.after_hour:
        logger.info("Report carta: ancora prima delle %s, skip", cfg.report.after_hour)
        return False
    today = current.date().isoformat()
    if already_sent_today(conn, today):
        logger.info("Report carta: già inviato in data %s, skip", today)
        return False
    n = carta_count_idle(conn, cfg, current.replace(tzinfo=None))
    if n != 0:
        logger.info(
            "Report carta: %s articoli '%s' nelle ultime %s ore, skip",
            n,
            cfg.report.source,
            cfg.report.idle_hours,
        )
        return False
    logger.info(
        "Report carta: 0 articoli '%s' da %s ore e ora >= %s, invio",
        cfg.report.source,
        cfg.report.idle_hours,
        cfg.report.after_hour,
    )
    return True


def build_domain_table(
    conn: sqlite3.Connection,
    cfg: AppConfig,
    now: datetime | None = None,
) -> pd.DataFrame:
    current = now_in_tz(cfg.report.timezone, now)
    sql = load_sql(
        cfg,
        cfg.report.report_query_path,
        source=cfg.report.source,
        today=current.date().isoformat(),
        median_days=cfg.report.median_days,
    )
    table = pd.read_sql(sql, conn)
    if table.empty:
        return pd.DataFrame(columns=["dominio", "import", "mediana", "delta"])
    return table


def _fmt_delta(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "n/d"
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    if isinstance(value, (int, float)) and value > 0:
        return f"+{value:g}" if isinstance(value, float) else f"+{value}"
    return f"{value:g}" if isinstance(value, float) else str(value)


def _fmt_median(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "n/d"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return f"{value:g}"


def table_to_html(table: pd.DataFrame) -> str:
    if table.empty:
        return "<p><em>Nessun import da carta nel periodo considerato.</em></p>"

    rows = []
    for _, row in table.iterrows():
        rows.append(
            "<tr>"
            f"<td>{escape(str(row['dominio']))}</td>"
            f"<td style='text-align:right'>{int(row['import'])}</td>"
            f"<td style='text-align:right'>{_fmt_median(row['mediana'])}</td>"
            f"<td style='text-align:right'>{_fmt_delta(row['delta'])}</td>"
            "</tr>"
        )
    body = "\n".join(rows)
    return f"""<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">
<thead>
<tr>
  <th>Dominio</th>
  <th>Import oggi</th>
  <th>Mediana precedente</th>
  <th>Delta</th>
</tr>
</thead>
<tbody>
{body}
</tbody>
</table>"""


def table_to_text(table: pd.DataFrame) -> str:
    if table.empty:
        return "(nessun import da carta nel periodo considerato)"
    lines = ["Dominio | Import oggi | Mediana precedente | Delta", "-" * 56]
    for _, row in table.iterrows():
        lines.append(
            f"{row['dominio']} | {int(row['import'])} | {_fmt_median(row['mediana'])} | {_fmt_delta(row['delta'])}"
        )
    return "\n".join(lines)


def dashboard_link(base: str, today: str, source: str = "carta") -> str:
    params = urlencode({
        "start": f"{today}T00:00:00",
        "end": f"{today}T23:59:59",
        "sources": source,
    })
    root = (base or "https://dashboard.robinweb.it/").rstrip("/")
    return f"{root}/?{params}"


def load_template(cfg: AppConfig) -> str:
    return _resolve(cfg, cfg.email.template_path).read_text(encoding="utf-8")


def render_message(template: str, table_html: str, today: str, total: int, link: str = "") -> str:
    return (
        template.replace("%tabella%", table_html)
        .replace("%data%", today)
        .replace("%totale%", str(total))
        .replace("%link%", link)
    )


def render_subject(subject: str, today: str) -> str:
    return subject.replace("%data%", today)


def all_recipients(email_cfg: EmailConfig) -> list[str]:
    seen = []
    for addr in email_cfg.to + email_cfg.cc + email_cfg.bcc:
        if addr not in seen:
            seen.append(addr)
    return seen


def build_message(email_cfg: EmailConfig, subject: str, html_body: str, text_body: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = email_cfg.from_addr
    msg["To"] = ", ".join(email_cfg.to)
    if email_cfg.cc:
        msg["Cc"] = ", ".join(email_cfg.cc)
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def _send_via_sendmail(email_cfg: EmailConfig, recipients: list[str], raw: bytes) -> None:
    path = email_cfg.sendmail_path
    if not Path(path).is_file():
        raise FileNotFoundError(
            f"sendmail non trovato: {path}. Installa un MTA (postfix/sendmail) "
            'oppure imposta method = "smtp" in config.toml'
        )
    cmd = [path, "-oi", "-f", email_cfg.from_addr, "--", *recipients]
    proc = subprocess.run(cmd, input=raw, capture_output=True, timeout=60)
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout).decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"sendmail fallito ({proc.returncode}): {err}")


def _send_via_smtp(email_cfg: EmailConfig, recipients: list[str], raw: str) -> None:
    if not email_cfg.smtp_host:
        raise ValueError("smtp_host mancante in config [email]")
    with smtplib.SMTP(email_cfg.smtp_host, email_cfg.smtp_port, timeout=30) as smtp:
        if email_cfg.use_tls:
            smtp.starttls()
        if email_cfg.smtp_user:
            smtp.login(email_cfg.smtp_user, email_cfg.smtp_password)
        smtp.sendmail(email_cfg.from_addr, recipients, raw)


def send_email(email_cfg: EmailConfig, subject: str, html_body: str, text_body: str, dry_run: bool = False) -> None:
    recipients = all_recipients(email_cfg)
    if not recipients:
        raise ValueError("Nessun destinatario configurato in [email].to / cc / bcc")
    if not email_cfg.from_addr:
        raise ValueError("from_addr mancante in config [email]")

    msg = build_message(email_cfg, subject, html_body, text_body)

    if dry_run:
        logger.info("Dry-run email a %s\nSubject: %s\n%s", recipients, subject, text_body)
        print(text_body)
        return

    method = (email_cfg.method or "sendmail").lower()
    if method == "sendmail":
        _send_via_sendmail(email_cfg, recipients, msg.as_bytes())
    elif method == "smtp":
        _send_via_smtp(email_cfg, recipients, msg.as_string())
    else:
        raise ValueError(f"method email non valido: {method!r} (usa sendmail o smtp)")
    logger.info("Email report carta inviata a %s via %s", recipients, method)


def maybe_send_morning_report(
    conn: sqlite3.Connection,
    config_path: str | Path | None = None,
    now: datetime | None = None,
    force: bool = False,
    dry_run: bool = False,
) -> bool:
    cfg = load_config(config_path)
    ensure_sent_table(conn)
    if not should_send_report(conn, cfg, now=now, force=force):
        return False

    current = now_in_tz(cfg.report.timezone, now)
    today = current.date().isoformat()
    table = build_domain_table(conn, cfg, now=current)
    total = int(table["import"].sum()) if not table.empty else 0
    template = load_template(cfg)
    link = dashboard_link(cfg.email.dashboard_url, today, cfg.report.source)
    html_body = render_message(template, table_to_html(table), today, total, link)
    text_body = render_message(template, table_to_text(table), today, total, link)
    subject = render_subject(cfg.email.subject, today)
    send_email(cfg.email, subject, html_body, text_body, dry_run=dry_run)
    if not dry_run:
        mark_sent(conn, current.replace(tzinfo=None))
    return True
