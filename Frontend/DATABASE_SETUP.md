# Configurazione Database

Questa guida spiega come configurare il database per DataScope Analytics.

## Struttura Richiesta

Il database deve contenere una tabella chiamata `article_image_view` con i seguenti campi:

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `url` | TEXT | URL dell'articolo |
| `domain` | TEXT | Dominio del sito |
| `image_url` | TEXT | URL dell'immagine |
| `image_width` | INTEGER | Larghezza immagine in pixel |
| `image_height` | INTEGER | Altezza immagine in pixel |
| `image_extension` | TEXT | Estensione file (jpg, png, webp, etc.) |
| `image_weight` | INTEGER | Peso file in KB |
| `has_video` | BOOLEAN | Presenza di video (0 o 1) |
| `source` | TEXT | Fonte/Redazione |
| `published_at` | TIMESTAMP | Data di pubblicazione |
| `fetched_at` | TIMESTAMP | Data di fetch |

## Esportazione da SQLAlchemy a SQLite

Se hai un database gestito con SQLAlchemy (Python), puoi esportare i dati in SQLite:

### Opzione 1: Usando Python

```python
from sqlalchemy import create_engine
import sqlite3
import pandas as pd

# Connessione al database originale (PostgreSQL, MySQL, etc.)
source_engine = create_engine('postgresql://user:pass@localhost/dbname')

# Leggi i dati dalla view
df = pd.read_sql('SELECT * FROM article_image_view', source_engine)

# Crea database SQLite
sqlite_conn = sqlite3.connect('database.db')
df.to_sql('article_image_view', sqlite_conn, if_exists='replace', index=False)
sqlite_conn.close()
```

### Opzione 2: Esportazione diretta

Se il database originale è già SQLite, puoi semplicemente copiare il file:

```bash
cp /path/to/original/database.db ./database.db
```

### Opzione 3: Usando sqlite3 CLI

```bash
# Esporta da database originale
sqlite3 original.db ".dump article_image_view" > dump.sql

# Importa in nuovo database
sqlite3 database.db < dump.sql
```

## Configurazione

1. **Crea il file `.env` nella root del progetto:**

```env
DB_PATH=./database.db
VITE_API_URL=http://localhost:3001
PORT=3001
```

2. **Oppure usa variabili d'ambiente:**

```bash
export DB_PATH=/path/to/your/database.db
export PORT=3001
```

## Verifica

Per verificare che tutto funzioni:

```bash
# Avvia il server
npm run server:dev

# Dovresti vedere:
# ✅ Connected to database at: /path/to/database.db
# ✅ Table "article_image_view" found
# 🚀 Server running on http://localhost:3001
```

Poi testa l'endpoint:

```bash
curl http://localhost:3001/api/health
# Dovrebbe restituire: {"status":"ok","database":"connected"}
```

## Note

- Il server si connette al database in modalità **read-only** per sicurezza
- Assicurati che il database sia accessibile e che la tabella contenga dati
- Se il database non è trovato, il server non si avvierà e mostrerà un errore

