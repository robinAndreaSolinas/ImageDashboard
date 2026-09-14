#!/bin/bash

echo "🚀 Setup DataScope Analytics"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trovato. Installa Node.js v18 o superiore."
    exit 1
fi

echo "✅ Node.js trovato: $(node --version)"
echo ""

# Install frontend dependencies
echo "📦 Installazione dipendenze frontend..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Errore durante l'installazione delle dipendenze frontend"
    exit 1
fi

echo "✅ Dipendenze frontend installate"
echo ""

# Install backend dependencies
echo "📦 Installazione dipendenze backend..."
cd server
npm install

if [ $? -ne 0 ]; then
    echo "❌ Errore durante l'installazione delle dipendenze backend"
    exit 1
fi

cd ..
echo "✅ Dipendenze backend installate"
echo ""

# Check for database
if [ ! -f "${DB_PATH:-./database.db}" ]; then
    echo "⚠️  Database non trovato. Assicurati di avere un database SQLite con la tabella 'article_image_view'"
    echo "   Puoi specificare il percorso con: DB_PATH=/path/to/database.db"
    echo ""
fi

echo "✅ Setup completato!"
echo ""
echo "Per avviare l'applicazione:"
echo "  1. Avvia il server: npm run server:dev"
echo "  2. Avvia il frontend: npm run dev"
echo ""

