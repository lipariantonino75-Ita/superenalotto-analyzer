from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import os
import sys

app = Flask(__name__)
CORS(app)

from config import Config
from database import Database
from analysis import SuperEnalottoAnalyzer

db = Database()

def initialize_database():
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
    return jsonify({'name': 'SuperEnalotto Analyzer API', 'version': '1.0.0', 'status': 'active'})

@app.route('/api/health')
def health_check():
    try:
        if not db.conn: db.connect()
        count = db.cursor.execute('SELECT COUNT(*) FROM extractions').fetchone()[0]
        last_date = db.cursor.execute('SELECT MAX(extraction_date) FROM extractions').fetchone()[0]
        return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat(), 'extractions_count': count, 'last_extraction': last_date})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)})

@app.route('/api/analyze', methods=['POST'])
def analyze_numbers():
    try:
        data = request.get_json() or {}
        period = data.get('period', 'all')
        if not db.conn: db.connect()
        analyzer = SuperEnalottoAnalyzer(db)
        results = analyzer.perform_complete_analysis(period=period)
        if 'error' in results: return jsonify(results), 400
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats')
def get_stats():
    try:
        if not db.conn: db.connect()
        count = db.cursor.execute('SELECT COUNT(*) FROM extractions').fetchone()[0]
        first = db.cursor.execute('SELECT MIN(extraction_date) FROM extractions').fetchone()[0]
        last = db.cursor.execute('SELECT MAX(extraction_date) FROM extractions').fetchone()[0]
        return jsonify({'total_extractions': count, 'first_extraction': first, 'last_extraction': last, 'numbers_analyzed': 90})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extractions', methods=['POST'])
def add_extraction():
    try:
        data = request.get_json()
        date = data.get('date')
        numbers = data.get('numbers')
        if not date or not numbers or len(numbers) != 6: return jsonify({'error': 'Data e 6 numeri richiesti'}), 400
        if any(n < 1 or n > 90 for n in numbers): return jsonify({'error': 'Numeri devono essere tra 1 e 90'}), 400
        if not db.conn: db.connect()
        db.cursor.execute('INSERT INTO extractions (extraction_date, n1, n2, n3, n4, n5, n6) VALUES (?,?,?,?,?,?,?)', (date, numbers[0], numbers[1], numbers[2], numbers[3], numbers[4], numbers[5]))
        db.conn.commit()
        db.update_number_statistics()
        return jsonify({'success': True, 'message': 'Estrazione aggiunta con successo'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extractions', methods=['GET'])
def get_extractions():
    try:
        if not db.conn: db.connect()
        limit = request.args.get('limit', 50, type=int)
        extractions = db.cursor.execute('SELECT * FROM extractions ORDER BY extraction_date DESC LIMIT ?', (limit,)).fetchall()
        return jsonify([dict(row) for row in extractions])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extractions/<date>', methods=['DELETE'])
def delete_extraction(date):
    try:
        if not db.conn: db.connect()
        db.cursor.execute('DELETE FROM extractions WHERE extraction_date = ?', (date,))
        db.conn.commit()
        db.update_number_statistics()
        return jsonify({'success': True, 'message': f'Estrazione del {date} rimossa'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        if not email or not password: return jsonify({'error': 'Email e password richiesti'}), 400
        if len(password) < 4: return jsonify({'error': 'Password minima 4 caratteri'}), 400
        if not db.conn: db.connect()
        existing = db.cursor.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
        if existing: return jsonify({'error': 'Email già registrata'}), 400
        db.cursor.execute('INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)', (email, password, datetime.now()))
        db.conn.commit()
        return jsonify({'success': True, 'message': 'Registrazione completata'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        if not email or not password: return jsonify({'error': 'Email e password richiesti'}), 400
        if not db.conn: db.connect()
        user = db.cursor.execute('SELECT id, email FROM users WHERE email = ? AND password = ?', (email, password)).fetchone()
        if not user: return jsonify({'error': 'Credenziali non valide'}), 401
        return jsonify({'success': True, 'user_id': user['id'], 'email': user['email'], 'message': 'Login effettuato'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/check', methods=['POST'])
def check_numbers():
    try:
        data = request.get_json()
        numbers = data.get('numbers', [])
        if len(numbers) != 6: return jsonify({'error': 'Servono 6 numeri'}), 400
        if not db.conn: db.connect()
        numbers_detail = []
        for num in numbers:
            count = db.cursor.execute('SELECT COUNT(*) as c, MAX(extraction_date) as last FROM extractions WHERE ? IN (n1,n2,n3,n4,n5,n6)', (num,)).fetchone()
            numbers_detail.append({'number': num, 'ever_seen': count['c'] > 0, 'times': count['c'], 'last_seen': count['last']})
        all_query = 'SELECT extraction_date FROM extractions WHERE ' + ' AND '.join([f'? IN (n1,n2,n3,n4,n5,n6)' for _ in range(6)])
        all_result = db.cursor.execute(all_query, numbers).fetchone()
        return jsonify({'all_together': all_result is None, 'last_date': all_result['extraction_date'] if all_result else None, 'numbers_detail': numbers_detail})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extractions/sync', methods=['POST'])
def sync_extractions_to_excel():
    try:
        import pandas as pd
        if not db.conn: db.connect()
        extractions = db.cursor.execute('SELECT * FROM extractions ORDER BY extraction_date').fetchall()
        df = pd.DataFrame([dict(row) for row in extractions])
        excel_path = os.path.join(os.path.dirname(__file__), 'data', 'Archivio.xlsx')
        df.to_excel(excel_path, index=False)
        return jsonify({'success': True, 'message': f'Sincronizzate {len(extractions)} estrazioni'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/migrate', methods=['POST'])
def migrate_database():
    try:
        if not db.conn: db.connect()
        db.migrate_db()
        return jsonify({'success': True, 'message': 'Migrazione completata'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)