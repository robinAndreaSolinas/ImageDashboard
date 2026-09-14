import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Default HTTP port 80; can be overridden via PORT env (e.g. 443)
const PORT = process.env.PORT || 8081;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist (frontend build) in production
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('✅ Serving static files from:', distPath);
}

// Database connection
// Assumiamo che il database sia SQLite e si trovi nella directory del progetto
// Puoi modificare questo path in base alla tua configurazione
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'database.db');

let db;

try {
  db = new Database(DB_PATH, { readonly: true });
  console.log(`✅ Connected to database at: ${DB_PATH}`);
  
  // Verify table or view exists
  try {
    const tableCheck = db
      .prepare(
        "SELECT name, type FROM sqlite_master WHERE name = 'article_image_view' AND (type = 'table' OR type = 'view')"
      )
      .get();

    if (!tableCheck) {
      console.error('❌ Table or view "article_image_view" not found in database');
      console.error('Please ensure the database contains the required table or view.');
      process.exit(1);
    }
    console.log(`✅ "${tableCheck.name}" found in database as ${tableCheck.type}`);
  } catch (err) {
    console.error('❌ Error checking table:', err.message);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error connecting to database:', error.message);
  console.error('Please ensure the database file exists and the path is correct.');
  console.error(`Expected path: ${DB_PATH}`);
  console.error('You can set a custom path with: DB_PATH=/path/to/database.db');
  process.exit(1);
}

// Helper function to convert bytes to kilobytes (rounded)
const bytesToKilobytes = (bytes) => {
  if (typeof bytes !== 'number' || isNaN(bytes)) return 0;
  return Math.round(bytes / 1024);
};

// Helper function to convert database row to DataItem
const rowToDataItem = (row, index) => {
  return {
    id: `id-${index}-${row.url?.substring(0, 20) || 'unknown'}`,
    url: row.url || '',
    domain: row.domain || '',
    image_url: row.image_url || '',
    image_width: row.image_width || 0,
    image_height: row.image_height || 0,
    image_extension: row.image_extension || '',
    // DB memorizza il peso in byte: converto in KB arrotondati
    image_weight: bytesToKilobytes(row.image_weight || 0),
    has_video: Boolean(row.has_video),
    source: row.source || '',
    published_at: row.published_at ? new Date(row.published_at).toISOString() : new Date().toISOString(),
    fetched_at: row.fetched_at ? new Date(row.fetched_at).toISOString() : new Date().toISOString(),
  };
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// Get all data from article_image_view
app.get('/api/data', (req, res) => {
  try {
    const query = 'SELECT * FROM article_image_view';
    const rows = db.prepare(query).all();
    
    const data = rows.map((row, index) => rowToDataItem(row, index));
    
    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data with optional filters (for future use)
app.get('/api/data/filtered', (req, res) => {
  try {
    const { domain, source, extension, hasVideo } = req.query;
    
    let query = 'SELECT * FROM article_image_view WHERE 1=1';
    const params = [];
    
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

// Serve frontend for all non-API routes (SPA fallback)
if (existsSync(distPath)) {
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
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

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 API endpoint: http://${HOST}:${PORT}/api/data`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  if (db) {
    db.close();
    console.log('Database connection closed.');
  }
  process.exit(0);
});

