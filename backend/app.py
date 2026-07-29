"""
API principale per SuperEnalotto Analyzer
"""
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from datetime import datetime, timedelta
import os

from config import get_config
from database import Database
from analysis import SuperEnalottoAnalyzer

# Inizializza app Flask
app = Flask(__name__)

# Carica configurazione
config = get_config()
app.config.from_object(config)

# Abilita CORS
CORS(app)

# Inizializza database
db = Database()

@app.before_first_request
def initialize():
    """Inizializzazione prima della prima richiesta"""
    if db.init_db():
        # Popola con dati di esempio se necessario
        extractions = db.get_extractions(1)
        if not extractions:
            db.seed_sample_data()
        print("✅ Sistema inizializzato con successo")

@app.route('/')
def home():
    """Endpoint root"""
    return jsonify({
        'name': 'SuperEnalotto Analyzer API',
        'version': '1.0.0',
        'status': 'active',
        'endpoints': {
            'analyze': '/api/analyze',
            'health': '/api/health',
            'stats': '/api/stats'
        }
    })

@app.route('/api/health')
def health_check():
    """Verifica stato del servizio"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected' if db.conn else 'disconnected'
    })

@app.route('/api/stats')
def get_statistics():
    """Statistiche generali del sistema"""
    try:
        extractions = db.get_extractions(200)
        
        stats = {
            'total_extractions': len(extractions),
            'last_extraction': extractions[0]['extraction_date'] if extractions else None,
            'database_size': os.path.getsize(config.DATABASE_PATH) if os.path.exists(config.DATABASE_PATH) else 0,
            'users_count': 0  # Da implementare
        }
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_numbers():
    """
    Endpoint principale per l'analisi statistica
    
    Request body:
    {
        "user_id": "optional_user_id",
        "parameters": {
            "top_numbers": 9,
            "combinations": 10
        }
    }
    """
    try:
        # Verifica parametri richiesta
        data = request.get_json() or {}
        user_id = data.get('user_id')
        
        # Verifica abbonamento (se user_id fornito)
        if user_id:
            subscription = db.get_user_subscription(user_id)
            if not subscription:
                # Verifica periodo di prova
                user = db.cursor.execute(
                    'SELECT created_at FROM users WHERE id = ?',
                    (user_id,)
                ).fetchone()
                
                if user:
                    trial_end = datetime.strptime(
                        user['created_at'], '%Y-%m-%d %H:%M:%S'
                    ) + timedelta(days=config.FREE_TRIAL_DAYS)
                    
                    if datetime.now() > trial_end:
                        return jsonify({
                            'error': 'Periodo di prova scaduto',
                            'subscription_required': True
                        }), 403
                else:
                    return jsonify({
                        'error': 'Utente non trovato',
                        'subscription_required': True
                    }), 404
        
        # Esegui analisi
        analyzer = SuperEnalottoAnalyzer(db)
        results = analyzer.perform_complete_analysis()
        
        if 'error' in results:
            return jsonify(results), 400
        
        # Salva analisi se utente autenticato
        if user_id:
            db.cursor.execute('''
                INSERT INTO saved_analyses 
                (user_id, analysis_type, parameters, results, top_numbers, combinations)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                'complete',
                str(data.get('parameters', {})),
                str(results),
                str(results.get('top_9_numeri', [])),
                str(results.get('migliori_sestine', []))
            ))
            db.conn.commit()
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/register', methods=['POST'])
def register_user():
    """Registrazione nuovo utente"""
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email richiesta'}), 400
        
        # Verifica se utente esiste
        existing = db.cursor.execute(
            'SELECT id FROM users WHERE email = ?', (email,)
        ).fetchone()
        
        if existing:
            return jsonify({
                'user_id': existing['id'],
                'message': 'Utente già registrato'
            })
        
        # Crea nuovo utente
        db.cursor.execute(
            'INSERT INTO users (email, created_at) VALUES (?, ?)',
            (email, datetime.now())
        )
        db.conn.commit()
        
        user_id = db.cursor.lastrowid
        
        return jsonify({
            'user_id': user_id,
            'message': 'Utente registrato con successo',
            'trial_end': (datetime.now() + timedelta(days=config.FREE_TRIAL_DAYS)).isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/subscription/create', methods=['POST'])
def create_subscription():
    """Crea un nuovo abbonamento"""
    try:
        data = request.json
        user_id = data.get('user_id')
        plan_type = data.get('plan')
        
        if not user_id or not plan_type:
            return jsonify({'error': 'user_id e plan richiesti'}), 400
        
        if plan_type not in config.SUBSCRIPTION_PLANS:
            return jsonify({'error': 'Piano non valido'}), 400
        
        plan = config.SUBSCRIPTION_PLANS[plan_type]
        start_date = datetime.now()
        end_date = start_date + timedelta(days=plan['duration_days'])
        
        # Disattiva abbonamenti precedenti
        db.cursor.execute(
            'UPDATE subscriptions SET is_active = 0 WHERE user_id = ?',
            (user_id,)
        )
        
        # Crea nuovo abbonamento
        db.cursor.execute('''
            INSERT INTO subscriptions 
            (user_id, plan_type, start_date, end_date, is_active)
            VALUES (?, ?, ?, ?, 1)
        ''', (user_id, plan_type, start_date, end_date))
        
        db.conn.commit()
        
        return jsonify({
            'success': True,
            'plan': plan_type,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'message': f'Abbonamento {plan["name"]} attivato con successo'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/subscription/check', methods=['POST'])
def check_subscription():
    """Verifica stato abbonamento"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id richiesto'}), 400
        
        subscription = db.get_user_subscription(user_id)
        
        if subscription:
            return jsonify({
                'active': True,
                'plan': subscription['plan_type'],
                'end_date': subscription['end_date'],
                'days_remaining': (
                    datetime.strptime(subscription['end_date'], '%Y-%m-%d %H:%M:%S') - 
                    datetime.now()
                ).days
            })
        
        # Verifica trial
        user = db.cursor.execute(
            'SELECT created_at FROM users WHERE id = ?',
            (user_id,)
        ).fetchone()
        
        if user:
            trial_end = datetime.strptime(
                user['created_at'], '%Y-%m-%d %H:%M:%S'
            ) + timedelta(days=config.FREE_TRIAL_DAYS)
            
            if datetime.now() < trial_end:
                return jsonify({
                    'active': True,
                    'plan': 'trial',
                    'end_date': trial_end.isoformat(),
                    'days_remaining': (trial_end - datetime.now()).days
                })
        
        return jsonify({
            'active': False,
            'message': 'Nessun abbonamento attivo',
            'plans': [
                {
                    'type': plan_type,
                    'name': plan_info['name'],
                    'price': f"€{plan_info['price_eur']}",
                    'duration': f"{plan_info['duration_days']} giorni"
                }
                for plan_type, plan_info in config.SUBSCRIPTION_PLANS.items()
            ]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Inizializza database all'avvio
    db.init_db()
    
    # Verifica se ci sono dati
    extractions = db.get_extractions(1)
    if not extractions:
        print("📊 Popolamento database con dati di esempio...")
        db.seed_sample_data()
    
    # Avvia server
    port = int(os.environ.get('PORT', 5000))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=config.DEBUG
    )