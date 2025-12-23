import json
import logging
import os
from datetime import datetime
from typing import Iterable
import pandas as pd
from lxml import etree
from io import BytesIO
from PIL import Image
import httpx
from slack_sdk import WebClient
import sqlite3
from pathlib import Path
import asyncio


SITEMAP = [
    f'https://www.lanazione.it/feedservice/sitemap/generic/lan/{datetime.year}/day/sitemap.xml',
    f'https://www.ilgiorno.it/feedservice/sitemap/generic/gio/{datetime.year}/day/sitemap.xml',
    f'https://www.ilrestodelcarlino.it/feedservice/sitemap/generic/rdc/{datetime.year}/day/sitemap.xml',
    f'https://www.quotidiano.net/feedservice/sitemap/generic/qn/{datetime.year}/day/sitemap.xml',
]

TABLE_NAME = 'article_image'

logger = logging.getLogger(__name__)

slack_client = WebClient(os.getenv('SLACK_BOT_TOKEN'))

http_client_params = {
    "http2": True,
    "follow_redirects": True,
    "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 (SeoAgent)",
        "X-Agent": "SeoAgent-images/1.0"
    }
}
http_client = httpx.Client(**http_client_params)

def notify(text:str, channel:str, **kwargs):
    message = slack_client.chat_postMessage(channel=channel, markdown_text=f"[Scraper Error] {text}", mrkdwn=True, **kwargs)
    if message.get('ok'):
        return message
    else:
        raise Exception(f"Error: {message.get('error')}")

def source_mapper(source):
    if not source:
        source = ""
    mapping = {
        "": "web",
        "farmacie": "MGC",
        "MIANEWS": "web-collaboratori",
        "LAB": "web-collaboratori",
        "DIRE": "web-collaboratori",
        "ASKANEWS": "web-collaboratori",
        "ANSA-MAR": "web-collaboratori",
        "ANSA-OM": "web-collaboratori",
        "ANSA-EMI": "web-collaboratori",
        "ANSA-TOS": "web-collaboratori",
        "AKS": "web-collaboratori",
        "ANSA": "web-collaboratori",
        "AGI": "web-collaboratori",
        "9colonne": "web-collaboratori",
        "adnmarche": "web-collaboratori",
        "ITALPRESS": "web-collaboratori",
        "ADN KRONOS": "web-collaboratori",
        "tgr": "web-collaboratori",
        "fromHermes": "prepara per il web",
        "ULTIMORA_SPORT": "agenzie-ansa",
        "ULTIMORA_ECONOMIA": "agenzie-ansa",
        "ULTIMORA_NEWS": "agenzie-ansa",
        "carta": "carta",
        "aicarta": "carta-opti",
        "aicarta-titolo": "carta-opti-title",
        "aicarta-titolo-desc": "carta-opti-title-som",
        "MGC": "MGC",
        "COLLABORATORI": "web-collaboratori",
        "Synch da Polopoly": "vecchio prepara per il web",
        "Smart Holo": "web-collaboratori",
        "migration": "web",
        "santi": "MGC",
        "oroscopo_barbanera": "carta-opti-title-sum",
        "APUNTOWER": "web-collaboratori",
        "AFFILIATION": "branded",
        "EURACTIVE": "web-collaboratori",
        "NOVA": "web-collaboratori",
    }

    return mapping.get(source, source)

async def _fetch_url_with_semaphore(url, *, client, semaphore):
    async with semaphore:
        try:
            return await client.get(url)
        except httpx.HTTPError as e:
            logger.error(f"{url} => Response Exception {e}")
            return None

async def _fetch_urls(urls:list[str], **kwargs):
    semaphore = asyncio.Semaphore(75)
    async with httpx.AsyncClient(**kwargs) as client:

        tasks = [_fetch_url_with_semaphore(url, client=client, semaphore=semaphore) for url in urls]

        responses = []

        for response in  await asyncio.gather(*tasks, return_exceptions=True):
            if response is not None:
                try:
                    response.raise_for_status()
                    responses.append(response)
                except httpx.HTTPError as exc:
                    logger.error(f"{exc.request.url} => [Response Exception] {exc}")


        return [response for response in responses if response is not None]

def request_batch(urls, **kwargs):
    kwargs.update(http_client_params)
    return asyncio.run(_fetch_urls(urls, **kwargs))

def request_multiple(urls, **kwargs) -> Iterable[httpx.Response]:
    kwargs.update(http_client_params)
    with httpx.Client(**kwargs) as client:
        for url in urls:
            yield client.get(url)

def get_document_from_url(url, parser):
    response = http_client.get(url)
    response.raise_for_status()
    doc = etree.fromstring(response.content, parser)
    return doc

def extract_article_url_from_sitemap(url):
    try:
        xml = get_document_from_url(url, etree.XMLParser(remove_blank_text=True, recover=True))
    except Exception as e:
        logger.error(f"{url} => Error Document: {e}")
        return []

    ns = xml.nsmap.copy()
    if None in ns:
        ns['sm'] = ns.pop(None)

    return xml.xpath('//sm:url/sm:loc/text()', namespaces=ns)

def get_image(url):
    response = http_client.get(url)
    response.raise_for_status()
    return Image.open(BytesIO(response.content)), len(response.content)

def get_article(sitemap_url):
    article_list = []
    article_url_list = extract_article_url_from_sitemap(sitemap_url)

    for response in request_batch(article_url_list):
        doc = etree.fromstring(response.content, etree.HTMLParser(remove_blank_text=True, recover=True))
        if doc is None:
            logger.error(f"{response.url} => Error: Empty document")
            continue

        try:
            imgage_url = doc.xpath('//meta[@property="og:image"]/@content')[0]
            image, weight = get_image(imgage_url)
        except httpx.UnsupportedProtocol as e:
            imgage_url = doc.xpath('//meta[@property="og:image"]/@content')[0]
            logger.warning(f"{response.url} => Warning Image: {e}")
            imgage_url = f'https://{imgage_url}'
            image, weight = get_image(imgage_url)
        except httpx.HTTPStatusError as e:
            imgage_url = doc.xpath('//meta[@property="og:image"]/@content')[0]
            notify(f"L'articolo {response.url} ha un [immagine che va in errore {e.response.status_code}]({imgage_url})'", "C09HS60BRA9")
            logger.warning(f"{response.url} => Warning Image: {e}")
            continue
        except IndexError:
            logger.error(f"{response.url} => Error: No image found")
            continue

        article_list.append({
            'article_url': str(response.url),
            'image_url': str(imgage_url),
            'image_width': image.size[0],
            'image_height': image.size[1],
            'image_extension': image.format,
            'image_weight': weight,
            'has_video': doc.xpath('//div[contains(@class, "dailymotion-player-wrapper")]/@content') != [],
            'published_at': doc.xpath('//meta[@property="article:published_time"]/@content')[0],
            'fetched_at': datetime.now(),
        })

        _data = doc.xpath('//script[@id="__NEXT_DATA__"]/text()')
        if _data:
            for d in _data:
                data = json.loads(d)
                source = data.get('props', {}).get('pageProps', {}).get('leaf', {}).get('source', 'web')
                article_list[-1]['source'] = source_mapper(source)
    logger.info(f'Extracted {len(article_list)} articles from {sitemap_url}')
    logger.debug(article_list)
    return pd.DataFrame(article_list)

def database_connection(path: str):
    path = Path(path)
    path.touch()
    try:
        conn = sqlite3.connect(path.resolve())
    except sqlite3.OperationalError as e:
        logger.error(f"Database {path.resolve()} not found")
        logger.error(f"Error connecting to database: {e}")
        raise
    cursor = conn.cursor()

    logger.info(f'Connected to database: {path}, create table {TABLE_NAME} if not exists')
    cursor.execute(f'''CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_url TEXT,
    image_url TEXT,
    image_width INTEGER,
    image_height INTEGER,
    image_extension TEXT,
    image_weight INTEGER,
    has_video BOOLEAN,
    source TEXT,
    published_at TIMESTAMP,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    return cursor, conn

def drop_duplicated_article(df: pd.DataFrame, conn):
    db_df = pd.read_sql(f'SELECT article_url FROM {TABLE_NAME}', conn)

    # Remove articles that are already in database
    df_clean = df[~df['article_url'].isin(db_df['article_url'])]
    logger.info(f'Removed {len(df) - len(df_clean)} duplicated articles')
    logger.debug(df_clean)
    return df_clean

def run(db_path:str = None):
    db, conn = database_connection(db_path or 'db.sqlite')
    dfs = []
    for sitemap in SITEMAP:
        dfs.append(get_article(sitemap))
    df = pd.concat(dfs)
    logger.info(f'Extracted {len(df)} articles from {len(SITEMAP)} sitemaps')
    df = drop_duplicated_article(df, conn)

    logger.info(f'Committing data to database: {len(df)} rows')

    df.to_sql('article_image', conn, if_exists='append', index=False)

    return df