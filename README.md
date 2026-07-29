# ?? SuperEnalotto Statistical Analyzer 
 
![Version](https://img.shields.io/badge/version-1.0.0-blue) 
![Python](https://img.shields.io/badge/python-3.9+-green) 
![Flask](https://img.shields.io/badge/flask-3.0-red) 
 
App professionale per l'analisi statistica avanzata dei numeri del SuperEnalotto con algoritmo proprietario di scoring. 
 
## ?? 14 Fattori di Analisi 
 
L'algoritmo analizza **14 fattori statistici** per ogni numero (1-90): 
 
| # | Fattore | Descrizione | 
|---|---------|-------------| 
| 1 | **Identificativo** | Numero da 1 a 90 | 
| 2 | **Gruppo Logico** | Decina di appartenenza | 
| 3 | **Frequenza Recente** | Presenze ultime 50 estrazioni | 
| 4 | **Hot/Cold/Neutral** | Classificazione termica | 
| 5 | **Base Confronto** | Rapporto C/E | 
| 6 | **Rapporto C/E** | Confronto frequenza/atteso | 
| 7 | **Ritardo Corrente** | Estrazioni dall'ultima uscita | 
| 8 | **Ritardo Storico** | Massimo ritardo registrato | 
| 9 | **Media Ritardi** | Media corrente/storico | 
| 10 | **Bonus Calcolato** | Punteggio pattern specifici | 
| 11 | **Indice di Forza** | (C/E) x 100 | 
| 12 | **Indice di Momento** | Trend recente vs storico | 
| 13 | **Output Macro** | Descrizione testuale | 
| 14 | **Verifica Stato** | OK/NO basato su soglia | 
 
### Output 
- ?? **Top 9 Numeri** consigliati 
- ?? **10 Migliori Sestine** con algoritmo di diversificazione 
- ?? **Punteggio Sintetico** (0-1) e **Finale** (0-100) 
 
## ?? Quick Start 
 
### Backend 
```bash 
cd backend 
python -m venv venv 
venv\Scripts\activate  # Windows 
pip install -r requirements.txt 
python app.py 
``` 
 
API disponibile su: `http://localhost:5000` 
 
## ?? Piani Abbonamento 
 
| Piano | Durata | Prezzo | 
|------|-------|-------| 
| ?? Trial | 3 giorni | Gratis | 
| ?? Settimanale | 7 giorni | ?2.99 | 
| ?? Mensile | 30 giorni | ?9.99 | 
| ?? Annuale | 365 giorni | ?79.99 | 
 
## ??? Tecnologie 
 
- **Python 3.9+** - Backend API 
- **Flask 3.0** - Framework web 
- **NumPy** - Calcoli statistici 
- **SQLite** - Database 
- **React Native/Expo** - App mobile 
- **Render** - Hosting 
- **Google Play Console** - Distribuzione 
