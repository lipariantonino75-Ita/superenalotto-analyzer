"""
Modulo principale per l'analisi statistica del SuperEnalotto
"""
import numpy as np
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from itertools import combinations
from config import Config

class SuperEnalottoAnalyzer:
    """
    Classe principale per l'analisi statistica avanzata dei numeri del SuperEnalotto
    """
    
    def __init__(self, database):
        """
        Inizializza l'analizzatore
        
        Args:
            database: Istanza del database per recuperare i dati
        """
        self.db = database
        self.config = Config.ANALYSIS_CONFIG
        self.numbers_range = range(
            self.config['numbers_range'][0], 
            self.config['numbers_range'][1] + 1
        )
        self.weights = self.config['weights']
        self.groups = Config.NUMBER_GROUPS
        
        # Cache per i risultati delle analisi
        self._cache = {}
    
    def get_group(self, number):
        """
        Determina il gruppo logico di appartenenza del numero
        
        Args:
            number: Numero da classificare (1-90)
        
        Returns:
            str: Nome del gruppo di appartenenza
        """
        for group_name, numbers in self.groups.items():
            if number in numbers:
                return group_name
        return "Non classificato"
    
    def calculate_frequencies(self, extractions, period='recent'):
        """
        Calcola le frequenze dei numeri
        
        Args:
            extractions: Lista delle estrazioni
            period: 'recent' o 'historical'
        
        Returns:
            Counter: Frequenze per ogni numero
        """
        if period == 'recent':
            data = extractions[:self.config['recent_extractions_limit']]
        else:
            data = extractions[:self.config['historical_extractions_limit']]
        
        frequency = Counter()
        
        for extraction in data:
            for i in range(1, 7):
                number = extraction.get(f'n{i}')
                if number:
                    frequency[number] += 1
        
        return frequency
    
    def classify_hot_cold(self, recent_freq):
        """
        Classifica i numeri in Hot, Cold o Neutral
        
        Args:
            recent_freq: Counter con frequenze recenti
        
        Returns:
            dict: Classificazione per ogni numero
        """
        if not recent_freq:
            return {num: 'NEUTRAL' for num in self.numbers_range}
        
        frequencies = [recent_freq.get(num, 0) for num in self.numbers_range]
        
        # Calcola percentili
        hot_threshold = np.percentile(frequencies, self.config['hot_threshold_percentile'])
        cold_threshold = np.percentile(frequencies, self.config['cold_threshold_percentile'])
        
        classification = {}
        
        for num in self.numbers_range:
            freq = recent_freq.get(num, 0)
            
            if freq >= hot_threshold and freq > 0:
                classification[num] = 'HOT'
            elif freq <= cold_threshold and freq < hot_threshold:
                classification[num] = 'COLD'
            else:
                classification[num] = 'NEUTRAL'
        
        return classification
    
    def calculate_delays(self, extractions):
        """
        Calcola i ritardi correnti e storici
        
        Args:
            extractions: Lista delle estrazioni
        
        Returns:
            tuple: (ritardi_correnti, ritardi_storici)
        """
        current_delays = {}
        historical_delays = {}
        
        for num in self.numbers_range:
            # Calcola ritardo corrente
            delay = 0
            for extraction in extractions:
                numbers = [extraction.get(f'n{i}') for i in range(1, 7)]
                if num in numbers:
                    break
                delay += 1
            
            current_delays[num] = delay
            
            # Recupera ritardo storico dal database
            stats = self.db.cursor.execute(
                'SELECT max_delay FROM number_statistics WHERE number = ?',
                (num,)
            ).fetchone()
            
            historical_delays[num] = stats['max_delay'] if stats else delay
        
        return current_delays, historical_delays
    
    def calculate_ce_ratio(self, frequency, total_extractions):
        """
        Calcola il rapporto Caldo/Freddo (C/E)
        
        Args:
            frequency: Counter con le frequenze
            total_extractions: Numero totale estrazioni analizzate
        
        Returns:
            dict: Rapporto C/E per ogni numero
        """
        ce_ratios = {}
        
        for num in self.numbers_range:
            freq = frequency.get(num, 0)
            
            # Valore atteso: (numeri per estrazione / totale numeri) * estrazioni totali
            expected = total_extractions * (
                self.config['numbers_per_extraction'] / 
                self.config['numbers_range'][1]
            )
            
            if expected > 0:
                ce_ratios[num] = freq / expected
            else:
                ce_ratios[num] = 0
        
        return ce_ratios
    
    def calculate_strength_index(self, ce_ratio):
        """
        Calcola l'indice di forza: (C/E) * 100
        
        Args:
            ce_ratio: Dizionario con rapporti C/E
        
        Returns:
            dict: Indice di forza per ogni numero
        """
        return {num: round(ratio * 100, 2) for num, ratio in ce_ratio.items()}
    
    def calculate_momentum_index(self, recent_freq, old_freq):
        """
        Calcola l'indice di momento
        
        Args:
            recent_freq: Frequenze recenti
            old_freq: Frequenze storiche
        
        Returns:
            dict: Indice di momento per ogni numero
        """
        momentum = {}
        
        for num in self.numbers_range:
            recent = recent_freq.get(num, 0)
            old = old_freq.get(num, 0)
            
            if old > 0:
                momentum[num] = round((recent / old) * 100, 2)
            else:
                momentum[num] = round(recent * 100, 2) if recent > 0 else 0
        
        return momentum
    
    def calculate_bonus(self, number, current_delays, historical_delays, classification):
        """
        Calcola il bonus per un numero basato su pattern specifici
        
        Args:
            number: Numero da analizzare
            current_delays: Ritardi correnti
            historical_delays: Ritardi storici
            classification: Classificazione Hot/Cold
        
        Returns:
            int: Punteggio bonus
        """
        bonus = 0
        current_delay = current_delays.get(number, 0)
        historical_delay = historical_delays.get(number, 0)
        
        # Bonus per prossimità al ritardo storico
        if historical_delay > 0 and current_delay > historical_delay * 0.8:
            bonus += 30
        
        # Bonus per numeri caldi
        if classification.get(number) == 'HOT':
            bonus += 20
        
        # Bonus per numeri in gruppi sottorappresentati
        group = self.get_group(number)
        # ... logica aggiuntiva per gruppi
        
        # Bonus per numeri con ritardo > media
        avg_delay = np.mean(list(current_delays.values()))
        if current_delay > avg_delay * 1.5:
            bonus += 15
        
        # Penalità per numeri molto freddi
        if classification.get(number) == 'COLD' and current_delay < 10:
            bonus -= 10
        
        return max(0, min(bonus, 100))  # Normalizza tra 0 e 100
    
    def calculate_scores(self, analysis_data):
        """
        Calcola i punteggi sintetici e finali per ogni numero
        
        Args:
            analysis_data: Dizionario con tutti i dati dell'analisi
        
        Returns:
            dict: Punteggi per ogni numero
        """
        scores = {}
        
        for num in self.numbers_range:
            # Calcola componenti del punteggio
            freq_score = analysis_data['frequencies']['recent'].get(num, 0) / 10
            
            hot_cold_score = {
                'HOT': 1.0,
                'NEUTRAL': 0.5,
                'COLD': 0.2
            }.get(analysis_data['classification'].get(num), 0.5)
            
            ce_score = min(analysis_data['ce_ratio'].get(num, 0) / 2, 1.0)
            
            delay_score = 1 - min(
                analysis_data['delays']['current'].get(num, 0) / 100, 1
            )
            
            strength_score = min(
                analysis_data['strength_index'].get(num, 0) / 200, 1
            )
            
            momentum_score = min(
                analysis_data['momentum_index'].get(num, 0) / 200, 1
            )
            
            bonus_score = analysis_data['bonus'].get(num, 0) / 100
            
            # Calcola punteggio sintetico pesato
            synthetic_score = (
                freq_score * self.weights['frequenza_recente'] +
                hot_cold_score * self.weights['hot_cold_status'] +
                ce_score * self.weights['rapporto_ce'] +
                delay_score * self.weights['ritardo_corrente'] +
                strength_score * self.weights['indice_forza'] +
                momentum_score * self.weights['indice_momento'] +
                bonus_score * self.weights['bonus']
            )
            
            # Punteggio finale normalizzato (0-100)
            final_score = round(synthetic_score * 100, 2)
            
            scores[num] = {
                'synthetic': round(synthetic_score, 3),
                'final': final_score,
                'components': {
                    'frequenza': round(freq_score * 100, 1),
                    'hot_cold': round(hot_cold_score * 100, 1),
                    'ce_ratio': round(ce_score * 100, 1),
                    'ritardo': round(delay_score * 100, 1),
                    'forza': round(strength_score * 100, 1),
                    'momento': round(momentum_score * 100, 1),
                    'bonus': round(bonus_score * 100, 1)
                }
            }
        
        return scores
    
    def generate_macro_output(self, number, analysis_data):
        """
        Genera output macro descrittivo per un numero
        
        Args:
            number: Numero da descrivere
            analysis_data: Dati dell'analisi
        
        Returns:
            str: Descrizione testuale dell'analisi
        """
        outputs = []
        
        classification = analysis_data['classification'].get(number, 'NEUTRAL')
        delay = analysis_data['delays']['current'].get(number, 0)
        group = self.get_group(number)
        
        # Descrizione gruppo
        outputs.append(f"Gruppo: {group}")
        
        # Stato Hot/Cold
        if classification == 'HOT':
            outputs.append("🔥 Numero CALDO - Alta frequenza recente")
        elif classification == 'COLD':
            outputs.append("❄️ Numero FREDDO - Bassa frequenza recente")
        else:
            outputs.append("➖ Numero NEUTRALE")
        
        # Analisi ritardo
        if delay > 50:
            outputs.append(f"⚠️ Ritardo significativo: {delay} estrazioni")
        elif delay > 30:
            outputs.append(f"📊 Ritardo moderato: {delay} estrazioni")
        elif delay < 5:
            outputs.append(f"✅ Uscita recente: {delay} estrazioni fa")
        
        # Indici
        strength = analysis_data['strength_index'].get(number, 0)
        if strength > 120:
            outputs.append(f"💪 Forza superiore alla media ({strength:.1f}%)")
        elif strength < 80:
            outputs.append(f"📉 Forza inferiore alla media ({strength:.1f}%)")
        
        momentum = analysis_data['momentum_index'].get(number, 0)
        if momentum > 120:
            outputs.append(f"📈 Trend positivo ({momentum:.1f}%)")
        elif momentum < 80:
            outputs.append(f"📉 Trend negativo ({momentum:.1f}%)")
        
        return " | ".join(outputs)
    
    def check_status(self, score):
        """
        Verifica lo stato OK/NO basato sul punteggio finale
        
        Args:
            score: Punteggio finale del numero
        
        Returns:
            str: 'OK' o 'NO'
        """
        return 'OK' if score > 50 else 'NO'
    
    def generate_top_combinations(self, top_numbers, scores, num_combinations=10):
        """
        Genera le migliori combinazioni di sestine
        
        Args:
            top_numbers: Lista dei migliori numeri
            scores: Dizionario con i punteggi
            num_combinations: Numero di combinazioni da generare
        
        Returns:
            list: Lista delle migliori combinazioni
        """
        # Prendi i migliori 18 numeri per avere varietà
        candidate_numbers = top_numbers[:18]
        
        # Genera tutte le combinazioni possibili (limitato per performance)
        all_combinations = list(combinations(candidate_numbers, 6))
        
        # Valuta ogni combinazione
        scored_combinations = []
        
        for combo in all_combinations[:1000]:  # Limita a 1000 per performance
            # Punteggio totale
            total_score = sum(scores.get(num, {}).get('final', 0) for num in combo)
            
            # Punteggio diversità (copertura gruppi)
            groups = [self.get_group(num) for num in combo]
            unique_groups = len(set(groups))
            diversity_score = (unique_groups / 9) * 100
            
            # Bonus bilanciamento
            numbers_list = list(combo)
            balance_score = 100 - np.std(numbers_list) * 2  # Penalizza varianza alta
            
            # Punteggio combinato
            combined_score = (
                total_score * 0.5 +
                diversity_score * 0.3 +
                balance_score * 0.2
            )
            
            scored_combinations.append({
                'numbers': sorted(combo),
                'total_score': round(total_score, 1),
                'diversity_score': round(diversity_score, 1),
                'balance_score': round(balance_score, 1),
                'combined_score': round(combined_score, 1)
            })
        
        # Ordina per punteggio combinato
        scored_combinations.sort(key=lambda x: x['combined_score'], reverse=True)
        
        # Seleziona le migliori garantendo diversità
        best_combinations = []
        used_numbers = set()
        
        for combo in scored_combinations:
            if len(best_combinations) >= num_combinations:
                break
            
            # Verifica che non sia troppo simile alle precedenti
            is_diverse = True
            for existing in best_combinations:
                common = len(set(combo['numbers']) & set(existing['numbers']))
                if common >= 4:  # Troppo simile
                    is_diverse = False
                    break
            
            if is_diverse:
                best_combinations.append(combo)
        
        return best_combinations
    
    def perform_complete_analysis(self):
        """
        Esegue l'analisi completa di tutti i fattori
        
        Returns:
            dict: Risultati completi dell'analisi
        """
        try:
            # Recupera estrazioni
            extractions = self.db.get_extractions(200)
            
            if not extractions:
                return {'error': 'Nessuna estrazione disponibile nel database'}
            
            total_extractions = len(extractions)
            
            # 1. Calcola frequenze
            recent_freq = self.calculate_frequencies(extractions, 'recent')
            historical_freq = self.calculate_frequencies(extractions, 'historical')
            
            # 2. Classifica Hot/Cold/Neutral
            classification = self.classify_hot_cold(recent_freq)
            
            # 3. Calcola ritardi
            current_delays, historical_delays = self.calculate_delays(extractions)
            
            # 4. Calcola rapporto C/E
            ce_ratio = self.calculate_ce_ratio(historical_freq, total_extractions)
            
            # 5. Calcola indici
            strength_index = self.calculate_strength_index(ce_ratio)
            momentum_index = self.calculate_momentum_index(recent_freq, historical_freq)
            
            # 6. Calcola bonus
            bonus = {}
            for num in self.numbers_range:
                bonus[num] = self.calculate_bonus(
                    num, current_delays, historical_delays, classification
                )
            
            # 7. Prepara dati analisi
            analysis_data = {
                'frequencies': {
                    'recent': recent_freq,
                    'historical': historical_freq
                },
                'classification': classification,
                'delays': {
                    'current': current_delays,
                    'historical': historical_delays
                },
                'ce_ratio': ce_ratio,
                'strength_index': strength_index,
                'momentum_index': momentum_index,
                'bonus': bonus
            }
            
            # 8. Calcola punteggi
            scores = self.calculate_scores(analysis_data)
            
            # 9. Ordina per punteggio finale
            sorted_numbers = sorted(
                scores.items(), 
                key=lambda x: x[1]['final'], 
                reverse=True
            )
            
            # 10. Top 9 numeri
            top_9 = [num for num, _ in sorted_numbers[:9]]
            
            # 11. Genera combinazioni
            combinations = self.generate_top_combinations(
                top_9, scores, self.config['combinations_to_generate']
            )
            
            # 12. Prepara output dettagliato
            detailed_analysis = []
            
            for num, score in sorted_numbers:
                detailed_analysis.append({
                    'identificativo': num,
                    'gruppo': self.get_group(num),
                    'frequenza_recente': recent_freq.get(num, 0),
                    'frequenza_storica': historical_freq.get(num, 0),
                    'stato': classification[num],
                    'base_confronto': f"C/E = {ce_ratio.get(num, 0):.2f}",
                    'rapporto_ce': round(ce_ratio.get(num, 0), 3),
                    'ritardo_corrente': current_delays.get(num, 0),
                    'ritardo_storico': historical_delays.get(num, 0),
                    'media_ritardi': round(
                        (current_delays.get(num, 0) + historical_delays.get(num, 0)) / 2, 1
                    ),
                    'bonus_calcolato': bonus[num],
                    'indice_forza': strength_index.get(num, 0),
                    'indice_momento': momentum_index.get(num, 0),
                    'output_macro': self.generate_macro_output(num, analysis_data),
                    'verifica_stato': self.check_status(score['final']),
                    'punteggio_sintetico': score['synthetic'],
                    'punteggio_finale': score['final'],
                    'componenti_punteggio': score['components']
                })
            
            # 13. Prepara statistiche generali
            statistics = {
                'totale_estrazioni': total_extractions,
                'media_punteggio': round(np.mean([s['final'] for s in scores.values()]), 1),
                'deviazione_standard': round(np.std([s['final'] for s in scores.values()]), 1),
                'numeri_hot': sum(1 for c in classification.values() if c == 'HOT'),
                'numeri_cold': sum(1 for c in classification.values() if c == 'COLD'),
                'numeri_neutral': sum(1 for c in classification.values() if c == 'NEUTRAL'),
                'punteggio_massimo': max(s['final'] for s in scores.values()),
                'punteggio_minimo': min(s['final'] for s in scores.values()),
                'data_analisi': datetime.now().isoformat()
            }
            
            # 14. Risultato finale
            result = {
                'timestamp': datetime.now().isoformat(),
                'versione_analisi': '1.0.0',
                'top_9_numeri': top_9,
                'migliori_sestine': combinations,
                'analisi_dettagliata': detailed_analysis,
                'statistiche': statistics
            }
            
            return result
            
        except Exception as e:
            print(f"Errore durante l'analisi: {e}")
            return {'error': str(e)}