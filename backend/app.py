from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import os
import sys

# Inizializza app Flask
app = Flask(__name__)
CORS(app)

# Import moduli locali
from config import Config
from database import Database
from analysis import SuperEnalottoAnalyzer

# Inizializza database
db = Database()

def initialize_database():
    """Inizializza il database e importa dati reali se vuoto"""
    print("🔧 Inizializzazione database...")
    
    if not db.init_db():
        print("❌ Errore inizializzazione database")
        return
    
    # Assicura la connessione
    if not db.conn:
        db.connect()
    
    # Controlla se ci sono estrazioni
    count = db.cursor.execute('SELECT COUNT(*) FROM extractions').fetchone()[0]
    
    if count == 0:
        print("📥 Database vuoto! Importazione dati reali...")
        try:
            # Cerca il file Excel nella cartella data
            data_dir = os.path.join(os.path.dirname(__file__), 'data')
            
            if os.path.exists(data_dir):
                excel_files = [f for f in os.listdir(data_dir) if f.endswith('.xlsx')]
                
                if excel_files:
                    print(f"📁 Trovato file: {excel_files[0]}")
                    from import_data import import_real_extractions
                    excel_path = os.path.join(data_dir, excel_files[0])
                    import_real_extractions(excel_path)
                    print("✅ Dati reali importati con successo!")
                else:
                    print("⚠️ Nessun file Excel trovato, uso dati di esempio")
                    db.seed_sample_data()
            else:
                print("⚠️ Cartella data non trovata, uso dati di esempio")
                db.seed_sample_data()
        except Exception as e:
            print(f"⚠️ Errore importazione: {e}")
            print("📥 Uso dati di esempio...")
            db.seed_sample_data()
    else:
        print(f"✅ Database già popolato con {count} estrazioni")
    
    db.disconnect()

# Inizializza il database all'avvio
initialize_database()

@app.route('/')
def home():
    return jsonify({
        'name': 'SuperEnalotto Analyzer API',
        'version': '1.0.0',
        'status': 'active',
        'database': 'ready'
    })

@app.route('/api/health')
def health_check():
    try:
        if not db.conn:
            db.connect()
        count = db.cursor.execute('SELECT COUNT(*) FROM extractions').fetchone()[0]
        last_date = db.cursor.execute('SELECT MAX(extraction_date) FROM extractions').fetchone()[0]
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'extractions_count': count,
            'last_extraction': last_date
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        })

@app.route('/api/analyze', methods=['POST'])
def analyze_numbers():
    try:
        data = request.get_json() or {}
        
        # Assicura connessione al database
        if not db.conn:
            db.connect()
        
        # Verifica che ci siano dati
        count = db.cursor.execute('SELECT COUNT(*) FROM extractions').fetchone()[0]
        if count == 0:
            return jsonify({'error': 'Nessuna estrazione disponibile nel database'}), 400
        
        analyzer = SuperEnalottoAnalyzer(db)
        results = analyzer.perform_complete_analysis()
        
        if 'error' in results:
            return jsonify(results), 400
        
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats')
def get_stats():
    try:
        if not db.conn:
            db.connect()
        
        count = db.cursor.execute('SELECT COUNT(*) FROM extractions').fetchone()[0]
        first = db.cursor.execute('SELECT MIN(extraction_date) FROM extractions').fetchone()[0]
        last = db.cursor.execute('SELECT MAX(extraction_date) FROM extractions').fetchone()[0]
        
        return jsonify({
            'total_extractions': count,
            'first_extraction': first,
            'last_extraction': last,
            'numbers_analyzed': 90
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==========================================
# NUOVE ROTTE: VISUALIZZA ED INSERISCI ESTRAZIONI
# ==========================================

@app.route('/api/extractions', methods=['GET'])
def get_extractions():
    """Recupera l'elenco delle estrazioni"""
    try:
        limit = request.args.get('limit', default=200, type=int)
        extractions = db.get_extractions(limit=limit)
        return jsonify({
            'success': True,
            'count': len(extractions),
            'extractions': extractions
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/extractions', methods=['POST'])
def add_extraction():
    """Inserisce una nuova estrazione e aggiorna le statistiche"""
    try:
        data = request.get_json() or {}
        
        extraction_date = data.get('extraction_date') # Formato: "YYYY-MM-DD"
        numbers = data.get('numbers')                  # Array di 6 numeri, es: [10, 23, 45, 60, 72, 89]
        jolly = data.get('jolly')
        superstar = data.get('superstar')

        # Validazione dei dati di input
        if not extraction_date or not numbers or len(numbers) != 6:
            return jsonify({
                'success': False, 
                'error': 'Data obbligatoria e servono esattamente 6 numeri principali.'
            }), 400

        # Ordina i numeri in ordine crescente
        sorted_numbers = sorted([int(n) for n in numbers])

        # Inserimento nel Database (aggiorna automaticamente anche le statistiche)
        success, message = db.add_extraction(
            extraction_date=extraction_date,
            n1=sorted_numbers[0],
            n2=sorted_numbers[1],
            n3=sorted_numbers[2],
            n4=sorted_numbers[3],
            n5=sorted_numbers[4],
            n6=sorted_numbers[5],
            jolly=int(jolly) if jolly is not None and str(jolly).isdigit() else None,
            superstar=int(superstar) if superstar is not None and str(superstar).isdigit() else None
        )

        if success:
            return jsonify({'success': True, 'message': message}), 201
        else:
            return jsonify({'success': False, 'error': message}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)