"""
Gestione database per SuperEnalotto Analyzer - Thread-safe
"""
import sqlite3
import os
from datetime import datetime, timedelta
from config import Config

class Database:
    """Classe per la gestione del database (thread-safe)"""
    
    def __init__(self, db_path=None):
        self.db_path = db_path or Config.DATABASE_PATH
        self.conn = None
        self.cursor = None
    
    def connect(self):
        """Connessione al database thread-safe"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            self.conn = sqlite3.connect(
                self.db_path, 
                check_same_thread=False,
                timeout=30
            )
            self.conn.row_factory = sqlite3.Row
            self.cursor = self.conn.cursor()
            self.cursor.execute("PRAGMA foreign_keys = ON")
            self.cursor.execute("PRAGMA journal_mode=WAL")
            return True
        except Exception as e:
            print(f"Errore connessione database: {e}")
            return False
    
    def disconnect(self):
        """Chiusura connessione"""
        if self.conn:
            try:
                self.conn.close()
            except:
                pass
            self.conn = None
            self.cursor = None
    
    def init_db(self):
        """Inizializza le tabelle del database"""
        if not self.conn:
            if not self.connect():
                return False
        
        try:
            # Tabella utenti
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL DEFAULT '1234',
                    google_play_id TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    device_info TEXT
                )
            ''')
            
            # Tabella abbonamenti
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    plan_type TEXT NOT NULL,
                    start_date TIMESTAMP NOT NULL,
                    end_date TIMESTAMP NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    auto_renew BOOLEAN DEFAULT 1,
                    purchase_token TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            ''')
            
            # Tabella estrazioni
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS extractions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    extraction_date DATE NOT NULL UNIQUE,
                    n1 INTEGER NOT NULL,
                    n2 INTEGER NOT NULL,
                    n3 INTEGER NOT NULL,
                    n4 INTEGER NOT NULL,
                    n5 INTEGER NOT NULL,
                    n6 INTEGER NOT NULL,
                    jolly INTEGER,
                    superstar INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabella analisi salvate
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS saved_analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    analysis_type TEXT NOT NULL,
                    parameters TEXT,
                    results TEXT,
                    top_numbers TEXT,
                    combinations TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            ''')
            
            # Tabella statistiche numeri
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS number_statistics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    number INTEGER NOT NULL UNIQUE,
                    total_appearances INTEGER DEFAULT 0,
                    current_delay INTEGER DEFAULT 0,
                    max_delay INTEGER DEFAULT 0,
                    last_appearance_date DATE,
                    hot_cold_status TEXT DEFAULT 'NEUTRAL',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            self.conn.commit()
            print("✅ Database inizializzato con successo")
            
            # Esegui migrazioni
            self.migrate_db()
            
            return True
            
        except Exception as e:
            print(f"❌ Errore inizializzazione database: {e}")
            return False
    
    def migrate_db(self):
        """Migra il database aggiungendo colonne mancanti"""
        try:
            # Aggiungi colonna password se non esiste
            try:
                self.cursor.execute("ALTER TABLE users ADD COLUMN password TEXT DEFAULT '1234'")
                self.conn.commit()
                print("✅ Migrazione: aggiunta colonna password")
            except:
                pass  # La colonna esiste già
            
            # Aggiungi colonna google_play_id se non esiste
            try:
                self.cursor.execute("ALTER TABLE users ADD COLUMN google_play_id TEXT")
                self.conn.commit()
                print("✅ Migrazione: aggiunta colonna google_play_id")
            except:
                pass
            
            # Aggiungi colonna last_login se non esiste
            try:
                self.cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")
                self.conn.commit()
                print("✅ Migrazione: aggiunta colonna last_login")
            except:
                pass
            
            # Aggiungi colonna is_active se non esiste
            try:
                self.cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
                self.conn.commit()
                print("✅ Migrazione: aggiunta colonna is_active")
            except:
                pass
            
            # Aggiungi colonna device_info se non esiste
            try:
                self.cursor.execute("ALTER TABLE users ADD COLUMN device_info TEXT")
                self.conn.commit()
                print("✅ Migrazione: aggiunta colonna device_info")
            except:
                pass
            
            print("✅ Migrazioni completate")
        except Exception as e:
            print(f"⚠️ Errore migrazione: {e}")
    
    def seed_sample_data(self):
        """Popola il database con dati di esempio"""
        if not self.conn:
            if not self.connect():
                return False
        
        try:
            sample_extractions = [
                ('2024-07-28', 12, 45, 67, 23, 89, 34, 56, 78),
                ('2024-07-26', 34, 78, 12, 56, 90, 23, 45, 67),
                ('2024-07-24', 1, 15, 30, 45, 60, 75, 90, 50),
                ('2024-07-21', 5, 18, 33, 47, 62, 81, 25, 70),
                ('2024-07-19', 8, 22, 37, 52, 68, 85, 40, 55),
                ('2024-07-17', 3, 28, 41, 55, 71, 88, 12, 65),
                ('2024-07-14', 14, 39, 44, 58, 73, 82, 20, 35),
                ('2024-07-12', 7, 19, 31, 49, 64, 79, 33, 60),
                ('2024-07-10', 11, 25, 36, 53, 69, 86, 42, 77),
                ('2024-07-07', 2, 17, 43, 57, 74, 84, 28, 48),
            ]
            
            for extraction in sample_extractions:
                try:
                    self.cursor.execute('''
                        INSERT OR IGNORE INTO extractions 
                        (extraction_date, n1, n2, n3, n4, n5, n6, jolly, superstar)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', extraction)
                except:
                    pass
            
            for number in range(1, 91):
                self.cursor.execute('''
                    INSERT OR IGNORE INTO number_statistics 
                    (number, total_appearances, current_delay, max_delay, hot_cold_status)
                    VALUES (?, 0, 0, 0, 'NEUTRAL')
                ''', (number,))
            
            self.update_number_statistics()
            self.conn.commit()
            print("✅ Dati di esempio inseriti con successo")
            return True
            
        except Exception as e:
            print(f"❌ Errore inserimento dati: {e}")
            return False
    
    def update_number_statistics(self):
        """Aggiorna le statistiche per tutti i numeri"""
        if not self.conn:
            return
        
        try:
            extractions = self.cursor.execute(
                'SELECT * FROM extractions ORDER BY extraction_date DESC'
            ).fetchall()
            
            if not extractions:
                return
            
            for number in range(1, 91):
                appearances = 0
                last_appearance = None
                current_delay = 0
                
                for extraction in extractions:
                    numbers = [extraction[f'n{i}'] for i in range(1, 7)]
                    if number in numbers:
                        appearances += 1
                        if last_appearance is None:
                            last_appearance = extraction['extraction_date']
                            break
                    elif last_appearance is None:
                        current_delay += 1
                
                self.cursor.execute('''
                    UPDATE number_statistics 
                    SET total_appearances = ?,
                        current_delay = ?,
                        last_appearance_date = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE number = ?
                ''', (appearances, current_delay, last_appearance, number))
                
                self.cursor.execute('''
                    UPDATE number_statistics 
                    SET max_delay = MAX(max_delay, ?)
                    WHERE number = ?
                ''', (current_delay, number))
            
            self.conn.commit()
            print("✅ Statistiche numeri aggiornate")
            
        except Exception as e:
            print(f"❌ Errore aggiornamento statistiche: {e}")
    
    def get_extractions(self, limit=200):
        """Recupera le estrazioni dal database"""
        if not self.conn:
            if not self.connect():
                return []
        
        try:
            extractions = self.cursor.execute(
                'SELECT * FROM extractions ORDER BY extraction_date DESC LIMIT ?',
                (limit,)
            ).fetchall()
            return [dict(row) for row in extractions]
        except Exception as e:
            print(f"Errore recupero estrazioni: {e}")
            return []
    
    def get_user_subscription(self, user_id):
        """Verifica abbonamento utente"""
        if not self.conn:
            if not self.connect():
                return None
        
        try:
            subscription = self.cursor.execute('''
                SELECT * FROM subscriptions 
                WHERE user_id = ? AND is_active = 1 
                AND end_date > CURRENT_TIMESTAMP
                ORDER BY end_date DESC LIMIT 1
            ''', (user_id,)).fetchone()
            return dict(subscription) if subscription else None
        except Exception as e:
            print(f"Errore verifica abbonamento: {e}")
            return None