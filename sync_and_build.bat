@echo off
echo 🔄 Sincronizzazione database...
curl -X POST https://superenalotto-api.onrender.com/api/extractions/sync

echo.
echo 📥 Pull ultime modifiche...
git pull

echo.
echo 📤 Caricamento su GitHub...
git add backend/data/Archivio.xlsx backend/data/superenalotto.db
git commit -m "Auto-sync database prima della build"
git push

echo.
echo ✅ Sync completato! Pronto per la build.
pause