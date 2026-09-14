import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, watch, statSync } from 'fs';
import {
  connectRedis,
  redisStatus,
  cacheGet,
  cacheSet,
  cacheDelDefault,
  publishUpdate,
  subscribeUpdates,
  closeRedis,
} from './cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8081;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('✅ Serving static files from:', distPath);
}

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'database.db');

let db;

try {
  db = new Database(DB_PATH, { readonly: true });
  console.log(`✅ Connected to database at: ${DB_PATH}`);

  try {
    const tableCheck = db
      .prepare(
        "SELECT name, type FROM sqlite_master WHERE name = 'article_image_view' AND (type = 'table' OR type = 'view')"
      )
      .get();

    if (!tableCheck) {
      console.error('❌ Table or view "article_image_view" not found in database');
      process.exit(1);
    }
    console.log(`✅ "${tableCheck.name}" found in database as ${tableCheck.type}`);
  } catch (err) {
    console.error('❌ Error checking table:', err.message);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error connecting to database:', error.message);
  console.error(`Expected path: ${DB_PATH}`);
  process.exit(1);
}

const bytesToKilobytes = (bytes) => {
  if (typeof bytes !== 'number' || isNaN(bytes)) return 0;
  return Math.round(bytes / 1024);
};

const rowToDataItem = (row, index) => {
  return {
    id: `id-${index}-${row.url?.substring(0, 20) || 'unknown'}`,
    url: row.url || '',
    domain: row.domain || '',
    image_url: row.image_url || '',
    image_width: row.image_width || 0,
    image_height: row.image_height || 0,
    image_extension: row.image_extension || '',
    image_weight: bytesToKilobytes(row.image_weight || 0),
    has_video: Boolean(row.has_video),
    source: row.source || '',
    published_at: row.published_at ? new Date(row.published_at).toISOString() : new Date().toISOString(),
    fetched_at: row.fetched_at ? new Date(row.fetched_at).toISOString() : new Date().toISOString(),
  };
};

const BASE_WHERE = "NOT (url LIKE '%/ultimaora/%' OR url NOT LIKE '%//%/_%')";
const isValidDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

const loadFromDb = (from) => {
  let rows;
  if (from) {
    const query = `SELECT * FROM article_image_view WHERE ${BASE_WHERE} AND published_at >= date(?) AND published_at < date(?, '+30 days')`;
    rows = db.prepare(query).all(from, from);
  } else {
    const query = `SELECT * FROM article_image_view WHERE ${BASE_WHERE} AND published_at >= date('now', '-30 days')`;
    rows = db.prepare(query).all();
  }
  const data = rows.map((row, index) => rowToDataItem(row, index));
  return {
    success: true,
    count: data.length,
    data,
    blockFrom: from,
    cached: false,
  };
};

const getPayload = async (from, { bypassCache = false } = {}) => {
  if (!bypassCache) {
    const cached = await cacheGet(from);
    if (cached) {
      return { ...cached, cached: true };
    }
  }
  const payload = loadFromDb(from);
  await cacheSet(from, payload);
  return payload;
};

const sseClients = new Set();

const broadcastSse = (event, body) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(body)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
};

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected',
    redis: redisStatus(),
    liveClients: sseClients.size,
  });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: hello\ndata: ${JSON.stringify({ redis: redisStatus() })}\n\n`);
  sseClients.add(res);
  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.get('/api/data', async (req, res) => {
  try {
    const from = isValidDate(req.query.from) ? req.query.from : null;
    const bypassCache = req.query.refresh === '1';
    const payload = await getPayload(from, { bypassCache });
    res.json(payload);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/data/filtered', (req, res) => {
  try {
    const { domain, source, extension, hasVideo } = req.query;

    const from = isValidDate(req.query.from) ? req.query.from : null;
    let query = from
      ? `SELECT * FROM article_image_view WHERE ${BASE_WHERE} AND published_at >= date(?) AND published_at < date(?, '+30 days')`
      : `SELECT * FROM article_image_view WHERE ${BASE_WHERE} AND published_at >= date('now', '-30 days')`;

    const params = from ? [from, from] : [];

    if (domain) {
      query += ' AND domain = ?';
      params.push(domain);
    }

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    if (extension) {
      query += ' AND image_extension = ?';
      params.push(extension);
    }

    if (hasVideo !== undefined) {
      query += ' AND has_video = ?';
      params.push(hasVideo === 'true' ? 1 : 0);
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    const data = rows.map((row, index) => rowToDataItem(row, index));

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error fetching filtered data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

if (existsSync(distPath)) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    const indexPath = join(distPath, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not found');
    }
  });
}

const refreshDefaultCache = async (reason) => {
  try {
    await cacheDelDefault();
    const payload = await getPayload(null, { bypassCache: true });
    await publishUpdate({ reason, count: payload.count });
    broadcastSse('update', { reason, count: payload.count });
    console.log(`♻️ Cache default aggiornata (${payload.count} righe, ${reason})`);
  } catch (err) {
    console.error('Refresh cache fallito:', err.message);
  }
};

const watchDatabase = () => {
  let lastMtime = 0;
  try {
    lastMtime = statSync(DB_PATH).mtimeMs;
  } catch {
    return;
  }

  const check = async (reason) => {
    try {
      const mtime = statSync(DB_PATH).mtimeMs;
      if (mtime === lastMtime) return;
      lastMtime = mtime;
      await refreshDefaultCache(reason);
    } catch {
      /* db momentaneamente assente durante write */
    }
  };

  let timer = null;
  watch(dirname(DB_PATH), () => {
    clearTimeout(timer);
    timer = setTimeout(() => check('sqlite'), 1500);
  });
  setInterval(() => check('sqlite-poll'), 30000);
  console.log(`👀 Watch sqlite su ${dirname(DB_PATH)}`);
};

const shutdown = async () => {
  await closeRedis();
  if (db) {
    db.close();
    console.log('Database connection closed.');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const start = async () => {
  try {
    await connectRedis();
    await subscribeUpdates((msg) => broadcastSse('update', msg));
  } catch (err) {
    console.error('Redis non disponibile, dashboard senza cache:', err.message);
  }
  watchDatabase();
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📊 API endpoint: http://${HOST}:${PORT}/api/data`);
    console.log(`📡 Live events: http://${HOST}:${PORT}/api/events`);
  });
};

start().catch((err) => {
  console.error('Avvio fallito:', err);
  process.exit(1);
});
