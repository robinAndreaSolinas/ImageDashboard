import logging
import os
import sqlite3

import email_report

logging.basicConfig(level=logging.INFO)

DB_PATH = os.getenv("DB_PATH", "db.sqlite")


def main():
    conn = sqlite3.connect(DB_PATH)
    try:
        sent = email_report.maybe_send_morning_report(conn)
        logging.info("Report carta inviato" if sent else "Report carta non inviato")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
