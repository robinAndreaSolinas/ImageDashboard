# DataScope API Server

Backend Node.js per connettersi al database e fornire dati alla dashboard.

## Installazione

```bash
cd server
npm install
```

## Configurazione

Il server si connette a un database SQLite. Per specificare un percorso personalizzato, usa la variabile d'ambiente `DB_PATH`:

```bash
DB_PATH=/path/to/your/database.db npm start
```

Oppure crea un file `.env` nella root del progetto:

```
DB_PATH=/path/to/your/database.db
PORT=3001
```

## Avvio

```bash
# Sviluppo (con auto-reload)
npm run dev

# Produzione
npm start
```

Il server sarà disponibile su `http://localhost:3001`

## Endpoint API

- `GET /api/health` - Health check
- `GET /api/data` - Recupera tutti i dati dalla tabella `article_image_view`
- `GET /api/data/filtered?domain=...&source=...` - Recupera dati filtrati (opzionale)

## Note

Assicurati che il database SQLite esista e contenga la tabella `article_image_view` con i campi:
- url (TEXT)
- domain (TEXT)
- image_url (TEXT)
- image_width (INTEGER)
- image_height (INTEGER)
- image_extension (TEXT)
- image_weight (INTEGER)
- has_video (BOOLEAN)
- source (TEXT)
- published_at (TIMESTAMP)
- fetched_at (TIMESTAMP)

