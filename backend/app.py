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

@app.route('/')
def home():
    return jsonify({
        'name': 'SuperEnalotto Analyzer API',
        'version': '1.0.0',
        'status': 'active'
    })

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_numbers():
    try:
        data = request.get_json() or {}
        analyzer = SuperEnalottoAnalyzer(db)
        results = analyzer.perform_complete_analysis()
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    db.init_db()
    extractions = db.get_extractions(1)
    if not extractions:
        db.seed_sample_data()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
