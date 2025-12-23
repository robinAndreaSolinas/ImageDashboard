import os, scrape
from datetime import datetime

from slack_sdk import WebClient
import pandas as pd

DB_NAME = 'db.sqlite'
TABLE_ARTICLE = scrape.TABLE_NAME
TABLE_AUDIT = 'audit_image'

slack_client = WebClient(os.getenv('SLACK_BOT_TOKEN'))

cursor, conn = scrape.database_connection(DB_NAME)

TEXT_FORMAT = """{}
- **SIZE** (min 1200*675px): {size} -> {weight}
- **RATIO** (tra 1,75 e 1,80): {ratio}
- **REDA** : {source}"""

def db_audit(table_name:str = None):
    cursor.execute(f'''CREATE TABLE IF NOT EXISTS {table_name or TABLE_AUDIT} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    type TEXT NOT NULL,
    last_notify TIMESTAMP NOT NULL,
    FOREIGN KEY(article_id) REFERENCES article_image(id)
    )''')
    return cursor, conn

def notify(text:str, channel:str, **kwargs):
    message = slack_client.chat_postMessage(channel=channel, markdown_text=text, mrkdwn=True, **kwargs)
    if message.get('ok'):
        return message
    else:
        raise Exception(f"Error: {message.get('error')}")

def batch_notify(text:str, channel:str, max_length:int=3600, **kwargs):
    if not text:
        return

    messages = text.split('\n\n')
    current_batch = []
    current_length = 0

    for message in messages:
        message_length = len(message)
        if current_length + message_length + 2 <= max_length:
            current_batch.append(message)
            current_length += message_length + 2
        else:
            if current_batch:
                notify('\n\n'.join(current_batch), channel, **kwargs)
            current_batch = [message]
            current_length = message_length

    if current_batch:
        notify('\n\n'.join(current_batch), channel, **kwargs)

def add_audit(article_id, status, type, commit:bool = True):
    cursor.execute(f'''INSERT INTO {TABLE_AUDIT} (article_id, status, type, last_notify) VALUES (?, ?, ?, ?)''', (article_id, status, type, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    if commit:
        conn.commit()
        return cursor.lastrowid
    else:
        return None

def query(sql, params = None):
    return pd.read_sql(sql, conn, params=params)

def main():

    db_audit()
    scrape.run(DB_NAME)
    # select image with lower size
    low_img = query(f'''SELECT *
FROM article_image
WHERE image_width <= 1100 AND 
id NOT IN (SELECT article_id
           FROM audit_image
           WHERE status = 'notified' AND type = 'low_img') AND
article_url NOT LIKE '%/ultimaora/%'
ORDER BY image_width ASC LIMIT 50;
''')

    message=[]
    for index, row in low_img.iterrows():
        size = f"{row['image_width']}x{row['image_height']}"
        ratio = row['image_width'] / row['image_height']
        text = TEXT_FORMAT.format(row['article_url'],
                                  size=size if row['image_width'] >= 1200 else f"**{size}**",
                                  weight=f"{row['image_weight']/1024:.2f} KB",
                                  ratio=(f"{ratio:.2f}" if 1.75 <= ratio < 1.80  else f"**{ratio:.2f}**"),
                                  source=row['source'].upper()
                                  )
        if row['has_video']:
            text += "\n**VIDEO**: **SI** in **TOPMEDIA**"

        message.append(text)
        add_audit(row['id'], 'notified', 'low_img', False)
    if message:
        batch_notify(text=f"{"\n\n".join(message)}", channel=os.getenv('SLACK_CHANNEL'))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()
