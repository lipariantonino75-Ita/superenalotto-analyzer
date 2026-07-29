"""
Configurazione dell'applicazione SuperEnalotto Analyzer
"""
import os
from dotenv import load_dotenv

# Carica variabili d'ambiente
load_dotenv()

class Config:
    """Configurazione base"""
    # Database
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'superenalotto.db')
    DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{DATABASE_PATH}')
    
    # Sicurezza
    SECRET_KEY = os.getenv('SECRET_KEY', 'super-enalotto-secret-key-2024')
    
    # Configurazione prova gratuita
    FREE_TRIAL_DAYS = int(os.getenv('FREE_TRIAL_DAYS', '3'))
    
    # Piani abbonamento
    SUBSCRIPTION_PLANS = {
        'weekly': {
            'name': 'Settimanale',
            'duration_days': 7,
            'price_eur': 2.99,
            'google_play_id': 'superenalotto_weekly'
        },
        'monthly': {
            'name': 'Mensile',
            'duration_days': 30,
            'price_eur': 9.99,
            'google_play_id': 'superenalotto_monthly'
        },
        'annual': {
            'name': 'Annuale',
            'duration_days': 365,
            'price_eur': 79.99,
            'google_play_id': 'superenalotto_annual'
        }
    }
    
    # Configurazione analisi
    ANALYSIS_CONFIG = {
        'numbers_range': (1, 90),
        'numbers_per_extraction': 6,
        'recent_extractions_limit': 50,
        'historical_extractions_limit': 200,
        
        # Pesi per il calcolo del punteggio finale
        'weights': {
            'frequenza_recente': 0.15,
            'hot_cold_status': 0.10,
            'rapporto_ce': 0.15,
            'ritardo_corrente': 0.10,
            'indice_forza': 0.20,
            'indice_momento': 0.15,
            'bonus': 0.15
        },
        
        # Soglie per classificazione Hot/Cold
        'hot_threshold_percentile': 80,
        'cold_threshold_percentile': 20,
        
        # Configurazione output
        'top_numbers_count': 9,
        'combinations_to_generate': 10
    }
    
    # Gruppi logici/decine
    NUMBER_GROUPS = {
        'Prima Decina (1-9)': list(range(1, 10)),
        'Seconda Decina (10-19)': list(range(10, 20)),
        'Terza Decina (20-29)': list(range(20, 30)),
        'Quarta Decina (30-39)': list(range(30, 40)),
        'Quinta Decina (40-49)': list(range(40, 50)),
        'Sesta Decina (50-59)': list(range(50, 60)),
        'Settima Decina (60-69)': list(range(60, 70)),
        'Ottava Decina (70-79)': list(range(70, 80)),
        'Nona Decina (80-90)': list(range(80, 91))
    }
    
    # CORS
    CORS_ORIGINS = ['*']  # In produzione, limitare agli origini specifici

class DevelopmentConfig(Config):
    """Configurazione sviluppo"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Configurazione produzione"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Configurazione testing"""
    DEBUG = True
    TESTING = True
    DATABASE_PATH = ':memory:'

# Configurazione attiva basata su ambiente
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}

def get_config():
    """Restituisce la configurazione appropriata"""
    env = os.getenv('FLASK_ENV', 'development')
    return config_by_name.get(env, DevelopmentConfig)