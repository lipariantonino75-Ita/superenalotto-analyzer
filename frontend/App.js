import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';

const Stack = createStackNavigator();
const API_BASE_URL = 'https://superenalotto-api.onrender.com';

function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SuperEnalotto</Text>
        <Text style={styles.titleSmall}>Analyzer</Text>
        <Text style={styles.subtitle}>Analisi statistica avanzata - 14 fattori</Text>
      </View>
      <View style={styles.features}>
        <Text style={styles.sectionTitle}>Fattori di Analisi</Text>
        <Text style={styles.featureItem}>🎯 Identificativo 1-90</Text>
        <Text style={styles.featureItem}>📊 Decine e gruppi logici</Text>
        <Text style={styles.featureItem}>🔥 Hot/Cold/Neutral</Text>
        <Text style={styles.featureItem}>📈 Rapporto C/E e indici</Text>
        <Text style={styles.featureItem}>⏱️ Ritardi e bonus</Text>
        <Text style={styles.featureItem}>✅ Verifica stato OK/NO</Text>
        <Text style={styles.featureItem}>💯 Punteggio sintetico e finale</Text>
      </View>
      <TouchableOpacity style={styles.analyzeButton} onPress={() => navigation.navigate('Analysis')}>
        <Text style={styles.buttonText}>🎲 AVVIA ANALISI COMPLETA</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.subscriptionButton} onPress={() => navigation.navigate('Subscription')}>
        <Text style={styles.buttonText}>💳 GESTISCI ABBONAMENTO</Text>
      </TouchableOpacity>
      <Text style={styles.footer}>🆓 3 giorni di prova gratuita</Text>
    </ScrollView>
  );
}

function AnalysisScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const performAnalysis = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/analyze`, {});
      navigation.navigate('Results', { analysis: response.data });
    } catch (error) {
      Alert.alert('Errore', 'Impossibile completare l\'analisi. Riprova piu tardi.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.analysisHeader}>
        <Text style={styles.sectionTitle}>Analisi Statistica</Text>
        <Text style={styles.description}>L'algoritmo analizza tutti i 90 numeri usando 14 fattori statistici e genera le migliori 10 sestine consigliate.</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
          <Text style={styles.loadingText}>Analisi in corso...</Text>
          <Text style={styles.loadingSubtext}>Elaborazione di 14 fattori statistici</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.analyzeButton} onPress={performAnalysis}>
          <Text style={styles.buttonText}>🔍 INIZIA ANALISI</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ResultsScreen({ route }) {
  const { analysis } = route.params || {};
  if (!analysis) return <View style={styles.container}><Text style={styles.errorText}>Nessun risultato disponibile</Text></View>;
  return (
    <ScrollView style={styles.container}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>🎯 Top 9 Numeri Consigliati</Text>
        <View style={styles.numbersGrid}>
          {analysis.top_9_numeri?.map((num, index) => (
            <View key={index} style={styles.numberBadge}>
              <Text style={styles.rankText}>#{index + 1}</Text>
              <Text style={styles.numberText}>{num}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.combinationsSection}>
        <Text style={styles.sectionTitle}>🎲 Migliori 10 Sestine</Text>
        {analysis.migliori_sestine?.slice(0, 10).map((combo, index) => (
          <View key={index} style={styles.comboCard}>
            <Text style={styles.comboTitle}>Sestina #{index + 1}</Text>
            <Text style={styles.comboNumbers}>{combo.numbers?.join(' - ')}</Text>
            <View style={styles.scoresRow}>
              <Text style={styles.comboScore}>🎯 {combo.combined_score}</Text>
              <Text style={styles.diversityScore}>📊 {combo.diversity_score}%</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>📊 Statistiche</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analysis.statistiche?.numeri_hot}</Text>
            <Text style={styles.statLabel}>Hot 🔥</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analysis.statistiche?.numeri_cold}</Text>
            <Text style={styles.statLabel}>Cold ❄️</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analysis.statistiche?.punteggio_massimo}</Text>
            <Text style={styles.statLabel}>Max 💯</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function SubscriptionScreen() {
  const plans = [
    { id: 'weekly', name: 'Settimanale', price: '2.99', days: 7, color: '#4caf50' },
    { id: 'monthly', name: 'Mensile', price: '9.99', days: 30, color: '#2196f3' },
    { id: 'annual', name: 'Annuale', price: '79.99', days: 365, color: '#9c27b0' },
  ];
  return (
    <ScrollView style={styles.container}>
      <View style={styles.subscriptionHeader}>
        <Text style={styles.title}>Piani Abbonamento</Text>
        <Text style={styles.subtitle}>✅ 3 giorni di prova gratuita inclusi</Text>
      </View>
      {plans.map((plan) => (
        <TouchableOpacity key={plan.id} style={[styles.planCard, { borderLeftColor: plan.color }]}>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planDuration}>{plan.days} giorni di accesso</Text>
          </View>
          <View style={styles.planPriceContainer}>
            <Text style={[styles.planPrice, { color: plan.color }]}>€{plan.price}</Text>
          </View>
        </TouchableOpacity>
      ))}
      <View style={styles.trialInfo}>
        <Text style={styles.trialText}>🆓 Inizia con 3 giorni gratuiti</Text>
        <Text style={styles.trialSubtext}>Nessun impegno, disdici quando vuoi</Text>
      </View>
    </ScrollView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1a237e' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' } }}>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'SuperEnalotto Analyzer' }} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'Analisi' }} />
        <Stack.Screen name="Results" component={ResultsScreen} options={{ title: 'Risultati' }} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Abbonamento' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a237e', padding: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  titleSmall: { fontSize: 24, fontWeight: '300', color: '#fff' },
  subtitle: { fontSize: 14, color: '#b3b3b3', marginTop: 15 },
  features: { padding: 20, backgroundColor: '#fff', margin: 15, borderRadius: 15, elevation: 3 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#1a237e' },
  featureItem: { fontSize: 15, paddingVertical: 6, paddingLeft: 5 },
  analyzeButton: { backgroundColor: '#4caf50', marginHorizontal: 15, marginTop: 10, padding: 18, borderRadius: 12, alignItems: 'center', elevation: 3 },
  subscriptionButton: { backgroundColor: '#2196f3', marginHorizontal: 15, marginTop: 10, padding: 18, borderRadius: 12, alignItems: 'center', elevation: 3 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { textAlign: 'center', marginTop: 20, marginBottom: 30, color: '#666', fontSize: 14 },
  analysisHeader: { padding: 20, backgroundColor: '#fff', margin: 15, borderRadius: 12 },
  description: { fontSize: 14, color: '#666', marginTop: 10, lineHeight: 20 },
  loadingContainer: { alignItems: 'center', padding: 60 },
  loadingText: { fontSize: 18, marginTop: 20, fontWeight: 'bold' },
  loadingSubtext: { fontSize: 13, color: '#666', marginTop: 8 },
  resultHeader: { backgroundColor: '#1a237e', padding: 25, alignItems: 'center' },
  resultTitle: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 20 },
  numbersGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  numberBadge: { backgroundColor: '#fff', borderRadius: 15, padding: 12, alignItems: 'center', width: 65, elevation: 3 },
  rankText: { fontSize: 10, color: '#666', fontWeight: 'bold' },
  numberText: { fontSize: 24, fontWeight: 'bold', color: '#1a237e' },
  combinationsSection: { padding: 15 },
  comboCard: { backgroundColor: '#fff', padding: 18, marginVertical: 6, borderRadius: 12, elevation: 2 },
  comboTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a237e' },
  comboNumbers: { fontSize: 20, color: '#333', marginTop: 8, fontWeight: '500' },
  scoresRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  comboScore: { fontSize: 14, color: '#4caf50', fontWeight: 'bold' },
  diversityScore: { fontSize: 14, color: '#2196f3' },
  statsSection: { padding: 15, marginBottom: 30 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', gap: 10 },
  statCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', flex: 1, elevation: 2 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1a237e' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  errorText: { fontSize: 18, textAlign: 'center', marginTop: 50, color: '#666' },
  subscriptionHeader: { padding: 30, alignItems: 'center', backgroundColor: '#1a237e' },
  planCard: { backgroundColor: '#fff', marginHorizontal: 15, marginTop: 15, padding: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, elevation: 2 },
  planInfo: { flex: 1 },
  planName: { fontSize: 20, fontWeight: 'bold' },
  planDuration: { fontSize: 14, color: '#666', marginTop: 5 },
  planPriceContainer: { alignItems: 'flex-end' },
  planPrice: { fontSize: 28, fontWeight: 'bold' },
  trialInfo: { margin: 30, alignItems: 'center', padding: 20, backgroundColor: '#e8f5e9', borderRadius: 12 },
  trialText: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  trialSubtext: { fontSize: 14, color: '#666', marginTop: 5 },
});