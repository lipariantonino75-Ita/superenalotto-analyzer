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
        self.db = database
        self.config = Config.ANALYSIS_CONFIG
        self.numbers_range = range(
            self.config['numbers_range'][0], 
            self.config['numbers_range'][1] + 1
        )
        self.weights = self.config['weights']
        self.groups = Config.NUMBER_GROUPS
        self._cache = {}
    
    def get_group(self, number):
        for group_name, numbers in self.groups.items():
            if number in numbers:
                return group_name
        return "Non classificato"
    
    def calculate_frequencies(self, extractions, period='recent'):
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
        if not recent_freq:
            return {num: 'NEUTRAL' for num in self.numbers_range}
        
        frequencies = [recent_freq.get(num, 0) for num in self.numbers_range]
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
        current_delays = {}
        historical_delays = {}
        
        for num in self.numbers_range:
            delay = 0
            for extraction in extractions:
                numbers = [extraction.get(f'n{i}') for i in range(1, 7)]
                if num in numbers:
                    break
                delay += 1
            current_delays[num] = delay
            
            stats = self.db.cursor.execute(
                'SELECT max_delay FROM number_statistics WHERE number = ?', (num,)
            ).fetchone()
            historical_delays[num] = stats['max_delay'] if stats else delay
        
        return current_delays, historical_delays
    
    def calculate_ce_ratio(self, frequency, total_extractions):
        ce_ratios = {}
        for num in self.numbers_range:
            freq = frequency.get(num, 0)
            expected = total_extractions * (
                self.config['numbers_per_extraction'] / self.config['numbers_range'][1]
            )
            ce_ratios[num] = freq / expected if expected > 0 else 0
        return ce_ratios
    
    def calculate_strength_index(self, ce_ratio):
        return {num: round(ratio * 100, 2) for num, ratio in ce_ratio.items()}
    
    def calculate_momentum_index(self, recent_freq, old_freq):
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
        bonus = 0
        current_delay = current_delays.get(number, 0)
        historical_delay = historical_delays.get(number, 0)
        
        if historical_delay > 0 and current_delay > historical_delay * 0.8:
            bonus += 30
        if classification.get(number) == 'HOT':
            bonus += 20
        avg_delay = np.mean(list(current_delays.values()))
        if current_delay > avg_delay * 1.5:
            bonus += 15
        if classification.get(number) == 'COLD' and current_delay < 10:
            bonus -= 10
        
        return max(0, min(bonus, 100))
    
    def calculate_terzo_law(self, extractions, cycle_size=None):
        """Calcola la Legge del Terzo per ogni numero"""
        if cycle_size is None:
            cycle_size = self.config.get('terzo_cycle_size', 15)
        
        terzo_scores = {}
        num_cicli = min(6, len(extractions) // cycle_size)
        
        for num in self.numbers_range:
            score = 0
            for ciclo in range(num_cicli):
                start = ciclo * cycle_size
                end = start + cycle_size
                ciclo_extractions = extractions[start:end]
                
                appearances = sum(1 for e in ciclo_extractions 
                                if num in [e[f'n{i}'] for i in range(1, 7)])
                
                peso_ciclo = num_cicli - ciclo
                
                if appearances == 0:
                    score += 3 * peso_ciclo
                elif appearances == 1:
                    score += 1 * peso_ciclo
                else:
                    score -= 1 * peso_ciclo
            
            terzo_scores[num] = max(0, score)
        
        if terzo_scores:
            max_score = max(terzo_scores.values())
            if max_score > 0:
                terzo_scores = {k: round((v / max_score) * 100, 1) for k, v in terzo_scores.items()}
        
        return terzo_scores

    # ============ AMBI FREQUENTI ============
    def calculate_frequent_pairs(self, extractions, top_n=15):
        """Calcola gli ambi più frequenti"""
        pairs = Counter()
        for e in extractions[:500]:
            nums = sorted([e[f'n{i}'] for i in range(1, 7)])
            for i in range(len(nums)):
                for j in range(i+1, len(nums)):
                    pairs[(nums[i], nums[j])] += 1
        return pairs.most_common(top_n)

    # ============ TERNI FREQUENTI ============
    def calculate_frequent_triplets(self, extractions, top_n=10):
        """Calcola i terni più frequenti"""
        triplets = Counter()
        for e in extractions[:300]:
            nums = sorted([e[f'n{i}'] for i in range(1, 7)])
            for i in range(len(nums)):
                for j in range(i+1, len(nums)):
                    for k in range(j+1, len(nums)):
                        triplets[(nums[i], nums[j], nums[k])] += 1
        return triplets.most_common(top_n)

    # ============ QUATERNE FREQUENTI ============
    def calculate_frequent_quads(self, extractions, top_n=5):
        """Calcola le quaterne più frequenti"""
        quads = Counter()
        for e in extractions[:200]:
            nums = sorted([e[f'n{i}'] for i in range(1, 7)])
            for i in range(len(nums)):
                for j in range(i+1, len(nums)):
                    for k in range(j+1, len(nums)):
                        for l in range(k+1, len(nums)):
                            quads[(nums[i], nums[j], nums[k], nums[l])] += 1
        return quads.most_common(top_n)

    # ============ NUMERI SPIA ============
    def calculate_spy_numbers(self, extractions):
        """Quando esce un numero, quali numeri escono dopo?"""
        spy_map = defaultdict(Counter)
        
        for i in range(len(extractions) - 1):
            current = [extractions[i][f'n{j}'] for j in range(1, 7)]
            next_ext = [extractions[i+1][f'n{j}'] for j in range(1, 7)]
            for num in current:
                for next_num in next_ext:
                    if next_num != num:
                        spy_map[num][next_num] += 1
        
        spy_numbers = {}
        for num in range(1, 91):
            if num in spy_map:
                spy_numbers[num] = spy_map[num].most_common(5)
            else:
                spy_numbers[num] = []
        
        return spy_numbers

    def calculate_spy_score(self, number, spy_numbers, last_extraction):
        """Calcola punteggio basato sui numeri spia dall'ultima estrazione"""
        if not last_extraction:
            return 0
        
        last_numbers = [last_extraction[f'n{i}'] for i in range(1, 7)]
        score = 0
        
        for last_num in last_numbers:
            if last_num in spy_numbers:
                for spy_num, freq in spy_numbers[last_num]:
                    if spy_num == number:
                        score += freq * 10
        
        return min(score, 100)

    # ============ PAIR SCORE ============
    def calculate_pair_score(self, number, frequent_pairs, last_extraction):
        """Punteggio basato sugli ambi frequenti con i numeri dell'ultima estrazione"""
        if not last_extraction:
            return 0
        
        last_numbers = [last_extraction[f'n{i}'] for i in range(1, 7)]
        score = 0
        
        for pair, freq in frequent_pairs:
            if number in pair:
                other = pair[0] if pair[1] == number else pair[1]
                if other in last_numbers:
                    score += freq * 5
        
        return min(score, 100)

    # ============ CALCOLO PUNTEGGI ============
    def calculate_scores(self, analysis_data):
        scores = {}
        for num in self.numbers_range:
            freq_score = analysis_data['frequencies']['recent'].get(num, 0) / 10
            hot_cold_score = {'HOT': 1.0, 'NEUTRAL': 0.5, 'COLD': 0.2}.get(
                analysis_data['classification'].get(num), 0.5)
            ce_score = min(analysis_data['ce_ratio'].get(num, 0) / 2, 1.0)
            delay_score = 1 - min(analysis_data['delays']['current'].get(num, 0) / 100, 1)
            strength_score = min(analysis_data['strength_index'].get(num, 0) / 200, 1)
            momentum_score = min(analysis_data['momentum_index'].get(num, 0) / 200, 1)
            bonus_score = analysis_data['bonus'].get(num, 0) / 100
            terzo_score = analysis_data.get('legge_terzo', {}).get(num, 0) / 100
            spy_score = analysis_data.get('spy_score', {}).get(num, 0) / 100
            pair_score = analysis_data.get('pair_score', {}).get(num, 0) / 100
            
            synthetic_score = (
                freq_score * self.weights['frequenza_recente'] +
                hot_cold_score * self.weights['hot_cold_status'] +
                ce_score * self.weights['rapporto_ce'] +
                delay_score * self.weights['ritardo_corrente'] +
                strength_score * self.weights['indice_forza'] +
                momentum_score * self.weights['indice_momento'] +
                bonus_score * self.weights['bonus'] +
                terzo_score * self.weights.get('legge_terzo', 0.15) +
                spy_score * self.weights.get('numeri_spia', 0.10) +
                pair_score * self.weights.get('ambi_frequenti', 0.10)
            )
            
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
                    'bonus': round(bonus_score * 100, 1),
                    'legge_terzo': round(terzo_score * 100, 1),
                    'numeri_spia': round(spy_score * 100, 1),
                    'ambi_frequenti': round(pair_score * 100, 1),
                }
            }
        return scores
    
    def generate_macro_output(self, number, analysis_data):
        outputs = []
        classification = analysis_data['classification'].get(number, 'NEUTRAL')
        delay = analysis_data['delays']['current'].get(number, 0)
        group = self.get_group(number)
        terzo = analysis_data.get('legge_terzo', {}).get(number, 0)
        spy = analysis_data.get('spy_score', {}).get(number, 0)
        
        outputs.append(f"Gruppo: {group}")
        
        if classification == 'HOT':
            outputs.append("🔥 CALDO")
        elif classification == 'COLD':
            outputs.append("❄️ FREDDO")
        else:
            outputs.append("➖ NEUTRALE")
        
        if delay > 50:
            outputs.append(f"⚠️ Ritardo: {delay}")
        elif delay < 5:
            outputs.append(f"✅ Recente: {delay} fa")
        
        if terzo > 70:
            outputs.append(f"🎯 LeggeTerzo: ALTA")
        elif terzo > 40:
            outputs.append(f"📊 LeggeTerzo: media")
        
        if spy > 50:
            outputs.append(f"🕵️ Spia: ALTA ({spy:.0f}%)")
        
        return " | ".join(outputs)
    
    def check_status(self, score):
        return 'OK' if score > 50 else 'NO'
    
    def generate_top_combinations(self, top_numbers, scores, num_combinations=10):
        candidate_numbers = top_numbers[:18]
        all_combinations = list(combinations(candidate_numbers, 6))
        
        import random
        if len(all_combinations) > 2000:
            all_combinations = random.sample(all_combinations, 2000)
        
        scored_combinations = []
        for combo in all_combinations:
            total_score = sum(scores.get(num, {}).get('final', 0) for num in combo)
            groups = [self.get_group(num) for num in combo]
            unique_groups = len(set(groups))
            diversity_score = (unique_groups / 9) * 100
            numbers_list = list(combo)
            balance_score = 100 - np.std(numbers_list) * 2
            
            combined_score = total_score * 0.5 + diversity_score * 0.3 + balance_score * 0.2
            
            scored_combinations.append({
                'numbers': sorted(combo),
                'total_score': round(total_score, 1),
                'diversity_score': round(diversity_score, 1),
                'balance_score': round(balance_score, 1),
                'combined_score': round(combined_score, 1)
            })
        
        scored_combinations.sort(key=lambda x: x['combined_score'], reverse=True)
        
        best_combinations = []
        for combo in scored_combinations:
            if len(best_combinations) >= num_combinations:
                break
            is_diverse = True
            for existing in best_combinations:
                common = len(set(combo['numbers']) & set(existing['numbers']))
                if common >= 4:
                    is_diverse = False
                    break
            if is_diverse:
                best_combinations.append(combo)
        
        return best_combinations
    
    def perform_complete_analysis(self, period='all'):
        try:
            extractions = self.db.get_extractions(5000)
            
            if not extractions:
                return {'error': 'Nessuna estrazione disponibile nel database'}
            
            # Filtro periodo
            if period == '1m':
                cutoff = datetime.now() - timedelta(days=30)
            elif period == '6m':
                cutoff = datetime.now() - timedelta(days=180)
            elif period == '1y':
                cutoff = datetime.now() - timedelta(days=365)
            else:
                cutoff = None
            
            if cutoff:
                cutoff_str = cutoff.strftime('%Y-%m-%d')
                extractions = [e for e in extractions if e['extraction_date'] >= cutoff_str]
            
            if not extractions:
                return {'error': 'Nessuna estrazione nel periodo selezionato'}
            
            total_extractions = len(extractions)
            last_extraction = extractions[0] if extractions else None
            
            # Frequenze
            recent_freq = self.calculate_frequencies(extractions, 'recent')
            historical_freq = self.calculate_frequencies(extractions, 'historical')
            
            # Classifica
            classification = self.classify_hot_cold(recent_freq)
            
            # Ritardi
            current_delays, historical_delays = self.calculate_delays(extractions)
            
            # C/E Ratio
            ce_ratio = self.calculate_ce_ratio(historical_freq, total_extractions)
            
            # Indici
            strength_index = self.calculate_strength_index(ce_ratio)
            momentum_index = self.calculate_momentum_index(recent_freq, historical_freq)
            
            # Bonus
            bonus = {}
            for num in self.numbers_range:
                bonus[num] = self.calculate_bonus(num, current_delays, historical_delays, classification)
            
            # Legge del Terzo
            legge_terzo = self.calculate_terzo_law(extractions)
            
            # Ambi, Terni, Quaterne
            frequent_pairs = self.calculate_frequent_pairs(extractions)
            frequent_triplets = self.calculate_frequent_triplets(extractions)
            frequent_quads = self.calculate_frequent_quads(extractions)
            
            # Numeri Spia
            spy_numbers = self.calculate_spy_numbers(extractions)
            
            # Spy score
            spy_score = {}
            for num in self.numbers_range:
                spy_score[num] = self.calculate_spy_score(num, spy_numbers, last_extraction)
            
            # Pair score
            pair_score = {}
            for num in self.numbers_range:
                pair_score[num] = self.calculate_pair_score(num, frequent_pairs, last_extraction)
            
            # Dati analisi
            analysis_data = {
                'frequencies': {'recent': recent_freq, 'historical': historical_freq},
                'classification': classification,
                'delays': {'current': current_delays, 'historical': historical_delays},
                'ce_ratio': ce_ratio,
                'strength_index': strength_index,
                'momentum_index': momentum_index,
                'bonus': bonus,
                'legge_terzo': legge_terzo,
                'spy_score': spy_score,
                'pair_score': pair_score,
            }
            
            # Punteggi
            scores = self.calculate_scores(analysis_data)
            
            # Ordina
            sorted_numbers = sorted(scores.items(), key=lambda x: x[1]['final'], reverse=True)
            
            # Top 9
            top_9 = [num for num, _ in sorted_numbers[:9]]
            
            # Combinazioni
            combinations_list = self.generate_top_combinations(top_9, scores)
            
            # Output dettagliato
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
                    'media_ritardi': round((current_delays.get(num, 0) + historical_delays.get(num, 0)) / 2, 1),
                    'bonus_calcolato': bonus[num],
                    'indice_forza': strength_index.get(num, 0),
                    'indice_momento': momentum_index.get(num, 0),
                    'legge_terzo': legge_terzo.get(num, 0),
                    'numeri_spia': spy_score.get(num, 0),
                    'ambi_score': pair_score.get(num, 0),
                    'output_macro': self.generate_macro_output(num, analysis_data),
                    'verifica_stato': self.check_status(score['final']),
                    'punteggio_sintetico': score['synthetic'],
                    'punteggio_finale': score['final'],
                    'componenti_punteggio': score['components']
                })
            
            # Statistiche
            statistics = {
                'totale_estrazioni': total_extractions,
                'periodo': period,
                'media_punteggio': round(np.mean([s['final'] for s in scores.values()]), 1),
                'deviazione_standard': round(np.std([s['final'] for s in scores.values()]), 1),
                'numeri_hot': sum(1 for c in classification.values() if c == 'HOT'),
                'numeri_cold': sum(1 for c in classification.values() if c == 'COLD'),
                'numeri_neutral': sum(1 for c in classification.values() if c == 'NEUTRAL'),
                'punteggio_massimo': max(s['final'] for s in scores.values()),
                'punteggio_minimo': min(s['final'] for s in scores.values()),
                'data_analisi': datetime.now().isoformat()
            }
            
            result = {
                'timestamp': datetime.now().isoformat(),
                'versione_analisi': '1.2.0',
                'periodo': period,
                'top_9_numeri': top_9,
                'migliori_sestine': combinations_list,
                'analisi_dettagliata': detailed_analysis,
                'statistiche': statistics,
                'ambi_frequenti': [{'coppia': list(p), 'frequenza': f} for p, f in frequent_pairs[:10]],
                'terni_frequenti': [{'terzina': list(t), 'frequenza': f} for t, f in frequent_triplets[:5]],
                'numeri_spia_top': {str(k): [{'numero': s[0], 'frequenza': s[1]} for s in v[:3]] for k, v in list(spy_numbers.items())[:10]},
            }
            
            return result
            
        except Exception as e:
            print(f"Errore durante l'analisi: {e}")
            return {'error': str(e)}