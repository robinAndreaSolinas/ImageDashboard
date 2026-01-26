# DataScope Analytics

Dashboard per l'analisi di immagini e contenuti web con visualizzazioni interattive.

## Prerequisiti

- Node.js (v18 o superiore)
- Database SQLite con tabella `article_image_view`

## Installazione

1. **Installa le dipendenze del frontend:**
   ```bash
   npm install
   ```

2. **Installa le dipendenze del backend:**
   ```bash
   npm run server:install
   ```

3. **Configura il database:**
   
   Assicurati di avere un database SQLite con la tabella `article_image_view`. 
   Puoi specificare il percorso del database creando un file `.env` nella root:
   ```
   DB_PATH=./database.db
   VITE_API_URL=http://localhost:3001
   ```

## Avvio

### Sviluppo

1. **Avvia il server API** (in un terminale):
   ```bash
   npm run server:dev
   ```
   Il server sarà disponibile su `http://localhost:3001`

2. **Avvia il frontend** (in un altro terminale):
   ```bash
   npm run dev
   ```
   L'app sarà disponibile su `http://localhost:3000`

### Produzione

```bash
# Build frontend
npm run build

# Avvia server
npm run server:start
```

## Struttura Database

La tabella `article_image_view` deve contenere i seguenti campi:

- `url` (TEXT)
- `domain` (TEXT)
- `image_url` (TEXT)
- `image_width` (INTEGER)
- `image_height` (INTEGER)
- `image_extension` (TEXT)
- `image_weight` (INTEGER)
- `has_video` (BOOLEAN)
- `source` (TEXT)
- `published_at` (TIMESTAMP)
- `fetched_at` (TIMESTAMP)

## Note

- Se il server API non è disponibile, l'applicazione utilizzerà automaticamente dati mock
- Il server si connette al database in modalità read-only per sicurezza
