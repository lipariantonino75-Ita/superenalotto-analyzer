"""
Script per importare le estrazioni reali del SuperEnalotto dal 1997
Formato: N. conc. | Data estr. | 1° | 2° | 3° | 4° | 5° | 6° | J | SS
"""
import pandas as pd
import sqlite3
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from config import Config

def import_real_extractions(excel_path):
    """Importa le estrazioni reali nel database"""
    
    print("=" * 60)
    print("📥 IMPORTAZIONE ESTRAZIONI REALI SUPERENALOTTO")
    print("=" * 60)
    
    try:
        # Leggi il file Excel
        print(f"\n📖 Lettura file: {excel_path}")
        df = pd.read_excel(excel_path)
        
        print(f"📊 Trovate {len(df)} estrazioni")
        print(f"📋 Colonne: {list(df.columns)}\n")
        
        # Connetti al database
        db_path = Config.DATABASE_PATH
        print(f"🗄️ Database: {db_path}")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Pulisci vecchi dati
        print("\n🧹 Pulizia vecchi dati...")
        cursor.execute('DELETE FROM extractions')
        cursor.execute('DELETE FROM number_statistics')
        conn.commit()
        
        # Mappa le colonne (il tuo formato specifico)
        # Colonna 0: N. conc.
        # Colonna 1: Data estr.
        # Colonna 2: 1° numero
        # Colonna 3: 2° numero
        # Colonna 4: 3° numero
        # Colonna 5: 4° numero
        # Colonna 6: 5° numero
        # Colonna 7: 6° numero
        # Colonna 8: J (Jolly)
        # Colonna 9: SS (SuperStar)
        
        imported = 0
        errors = 0
        skipped = 0
        
        print("\n🔄 Importazione in corso...\n")
        
        for idx, row in df.iterrows():
            try:
                # Estrai e formatta la data
                date_val = row.iloc[1]  # Colonna "Data estr."
                
                if isinstance(date_val, datetime):
                    extraction_date = date_val.strftime('%Y-%m-%d')
                elif isinstance(date_val, str):
                    # Prova formati data italiani
                    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d']:
                        try:
                            extraction_date = datetime.strptime(date_val.strip(), fmt).strftime('%Y-%m-%d')
                            break
                        except:
                            continue
                    else:
                        extraction_date = date_val.strip()
                else:
                    extraction_date = str(date_val)
                
                # Estrai i 6 numeri principali
                n1 = int(row.iloc[2])  # 1°
                n2 = int(row.iloc[3])  # 2°
                n3 = int(row.iloc[4])  # 3°
                n4 = int(row.iloc[5])  # 4°
                n5 = int(row.iloc[6])  # 5°
                n6 = int(row.iloc[7])  # 6°
                
                # Verifica validità numeri
                numbers = [n1, n2, n3, n4, n5, n6]
                if any(n < 1 or n > 90 for n in numbers):
                    skipped += 1
                    continue
                
                if len(set(numbers)) != 6:
                    skipped += 1
                    continue
                
                # Jolly (può essere vuoto)
                jolly_val = row.iloc[8] if len(row) > 8 else None
                jolly = int(jolly_val) if pd.notna(jolly_val) and jolly_val != '' else None
                
                # SuperStar (può essere vuoto)
                ss_val = row.iloc[9] if len(row) > 9 else None
                superstar = int(ss_val) if pd.notna(ss_val) and ss_val != '' else None
                
                # Inserisci nel database
                cursor.execute('''
                    INSERT INTO extractions 
                    (extraction_date, n1, n2, n3, n4, n5, n6, jolly, superstar)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (extraction_date, n1, n2, n3, n4, n5, n6, jolly, superstar))
                
                imported += 1
                
                if imported % 500 == 0:
                    conn.commit()
                    print(f"   ✓ {imported} estrazioni importate... (data: {extraction_date})")
                    
            except Exception as e:
                errors += 1
                if errors <= 5:
                    print(f"   ⚠️ Errore riga {idx}: {e}")
                    print(f"      Dati: {list(row)[:10]}")
        
        conn.commit()
        
        # Statistiche finali
        print(f"\n" + "=" * 60)
        print(f"✅ IMPORTAZIONE COMPLETATA!")
        print(f"=" * 60)
        print(f"📥 Importate: {imported}")
        print(f"⚠️ Errori:   {errors}")
        print(f"⏭️ Saltate:  {skipped}")
        print(f"📅 Periodo:   dalla 1° all'ultima estrazione")
        
        # Verifica
        cursor.execute('SELECT COUNT(*) as c, MIN(extraction_date) as min_d, MAX(extraction_date) as max_d FROM extractions')
        stats = cursor.fetchone()
        print(f"\n📊 Database:")
        print(f"   Estrazioni totali: {stats[0]}")
        print(f"   Prima estrazione:  {stats[1]}")
        print(f"   Ultima estrazione: {stats[2]}")
        
        # Aggiorna statistiche numeri
        print(f"\n📊 Aggiornamento statistiche numeri...")
        from database import Database
        db = Database()
        db.connect()
        db.update_number_statistics()
        db.disconnect()
        print(f"   ✓ Statistiche aggiornate per 90 numeri")
        
        conn.close()
        print(f"\n🎉 Database pronto con dati reali!")
        print(f"🚀 Ora l'API usa estrazioni vere dal 1997!")
        
    except FileNotFoundError:
        print(f"\n❌ ERRORE: File non trovato!")
        print(f"   Percorso cercato: {excel_path}")
        print(f"\n💡 Soluzione:")
        print(f"   1. Copia il file Excel nella cartella: backend/data/")
        print(f"   2. Rinominalo 'estrazioni.xlsx'")
        print(f"   3. Riavvia questo script")
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    # Percorso del file Excel
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        print(f"📁 Creata cartella: {data_dir}")
        print("💡 Copia il file Excel in questa cartella e rinominalo 'estrazioni.xlsx'")
        sys.exit(0)
    
    # Cerca file Excel
    excel_files = [f for f in os.listdir(data_dir) if f.endswith(('.xlsx', '.xls'))]
    
    if not excel_files:
        print("❌ Nessun file Excel trovato!")
        print(f"📁 Cartella: {data_dir}")
        print("💡 Copia qui il tuo file Excel delle estrazioni")
        sys.exit(1)
    
    # Se c'è un solo file, usalo
    excel_path = os.path.join(data_dir, excel_files[0])
    print(f"📁 File trovato: {excel_files[0]}")
    
    # Se ci sono più file, chiedi quale usare
    if len(excel_files) > 1:
        print("\n📁 File Excel trovati:")
        for i, f in enumerate(excel_files):
            print(f"   {i}: {f}")
        choice = input(f"\nScegli il numero (0-{len(excel_files)-1}): ").strip()
        excel_path = os.path.join(data_dir, excel_files[int(choice)])
    
    # Avvia importazione
    import_real_extractions(excel_path)