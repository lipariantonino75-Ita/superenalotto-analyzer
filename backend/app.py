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
    
    if not db.conn:
        db.connect()
    
    count = db.cursor.execute('SELECT COUNT(*) FROM extractions').fetchone()[0]
    
    if count == 0:
        print("📥 Database vuoto! Importazione dati reali...")
        try:
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
            db.seed_sample_data()
    else:
        print(f"✅ Database già popolato con {count} estrazioni")
    
    db.disconnect()

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
        return jsonify({'status': 'error', 'error': str(e)})

@app.route('/api/analyze', methods=['POST'])
def analyze_numbers():
    try:
        data = request.get_json() or {}
        if not db.conn:
            db.connect()
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

@app.route('/api/extractions', methods=['POST'])
def add_extraction():
    try:
        data = request.get_json()
        date = data.get('date')
        numbers = data.get('numbers')
        
        if not date or not numbers or len(numbers) != 6:
            return jsonify({'error': 'Data e 6 numeri richiesti'}), 400
        
        if any(n < 1 or n > 90 for n in numbers):
            return jsonify({'error': 'Numeri devono essere tra 1 e 90'}), 400
        
        if not db.conn:
            db.connect()
        
        db.cursor.execute('''
            INSERT INTO extractions (extraction_date, n1, n2, n3, n4, n5, n6)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (date, numbers[0], numbers[1], numbers[2], numbers[3], numbers[4], numbers[5]))
        
        db.conn.commit()
        db.update_number_statistics()
        
        return jsonify({'success': True, 'message': 'Estrazione aggiunta con successo'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extractions/<date>', methods=['DELETE'])
def delete_extraction(date):
    try:
        if not db.conn:
            db.connect()
        
        db.cursor.execute('DELETE FROM extractions WHERE extraction_date = ?', (date,))
        db.conn.commit()
        db.update_number_statistics()
        
        return jsonify({'success': True, 'message': f'Estrazione del {date} rimossa con successo'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)