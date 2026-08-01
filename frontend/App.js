import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const Stack = createStackNavigator();
const API_BASE_URL = 'https://superenalotto-api.onrender.com';

// ============ LOGIN SCREEN ============
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const user = await AsyncStorage.getItem('user');
    if (user) {
      navigation.replace('Home');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
      if (response.data.success) {
        await AsyncStorage.setItem('user', JSON.stringify(response.data));
        navigation.replace('Home');
      }
    } catch (error) {
      Alert.alert('Errore', 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginHeader}>
        <Text style={styles.title}>SuperEnalotto</Text>
        <Text style={styles.titleSmall}>Analyzer</Text>
        <Text style={styles.subtitle}>Accedi per continuare</Text>
      </View>
      <View style={styles.loginForm}>
        <TextInput style={styles.input} placeholder="Email" value={email}
          onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password}
          onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.analyzeButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Accesso...' : 'ACCEDI'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>Non hai un account? Registrati</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============ REGISTER SCREEN ============
function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password');
      return;
    }
    if (password.length < 4) {
      Alert.alert('Errore', 'Password minima 4 caratteri');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, { email, password });
      if (response.data.success) {
        Alert.alert('OK', 'Registrazione completata! Effettua il login.');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Errore', error.response?.data?.error || 'Registrazione fallita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginHeader}>
        <Text style={styles.title}>Registrazione</Text>
        <Text style={styles.subtitle}>Crea il tuo account</Text>
      </View>
      <View style={styles.loginForm}>
        <TextInput style={styles.input} placeholder="Email" value={email}
          onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password (min 4 caratteri)" value={password}
          onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.analyzeButton} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Registrazione...' : 'REGISTRATI'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Hai già un account? Accedi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============ HOME SCREEN ============
function HomeScreen({ navigation }) {
  const [totalExtractions, setTotalExtractions] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stats`);
      setTotalExtractions(response.data.total_extractions);
    } catch (error) {
      console.log('Errore statistiche');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    navigation.replace('Login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SuperEnalotto Analyzer</Text>
        <Text style={styles.subtitle}>Analisi statistica - 14 fattori</Text>
      </View>
      <View style={styles.statsBadge}>
        <Text style={styles.statsBadgeText}>
          {totalExtractions ? totalExtractions.toLocaleString() : '...'} estrazioni analizzate
        </Text>
        <Text style={styles.statsBadgeSubtext}>dal 1997 ad oggi</Text>
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
      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddExtraction')}>
        <Text style={styles.buttonText}>➕ INSERISCI NUOVA ESTRAZIONE</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.subscriptionButton} onPress={() => navigation.navigate('Subscription')}>
        <Text style={styles.buttonText}>💳 GESTISCI ABBONAMENTO</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>🚪 LOGOUT</Text>
      </TouchableOpacity>
      <Text style={styles.footer}>🆓 3 giorni di prova gratuita</Text>
    </ScrollView>
  );
}

// ============ ANALYSIS SCREEN ============
function AnalysisScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const performAnalysis = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/analyze`, {});
      navigation.navigate('Results', { analysis: response.data });
    } catch (error) {
      Alert.alert('Errore', 'Impossibile completare l\'analisi.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.analysisHeader}>
        <Text style={styles.sectionTitle}>Analisi Statistica</Text>
        <Text style={styles.description}>Analisi di tutti i 90 numeri con 14 fattori statistici.</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
          <Text style={styles.loadingText}>Analisi in corso...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.analyzeButton} onPress={performAnalysis}>
          <Text style={styles.buttonText}>🔍 INIZIA ANALISI</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============ RESULTS SCREEN ============
function ResultsScreen({ route }) {
  const { analysis } = route.params || {};
  if (!analysis) return <View style={styles.container}><Text>Nessun risultato</Text></View>;
  return (
    <ScrollView style={styles.container}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>🎯 Top 9 Numeri</Text>
        <View style={styles.numbersGrid}>
          {analysis.top_9_numeri?.map((num, index) => (
            <View key={index} style={styles.numberBadge}>
              <Text style={styles.rankText}>#{index+1}</Text>
              <Text style={styles.numberText}>{num}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.combinationsSection}>
        <Text style={styles.sectionTitle}>🎲 Migliori Sestine</Text>
        {analysis.migliori_sestine?.slice(0,10).map((combo, index) => (
          <View key={index} style={styles.comboCard}>
            <Text style={styles.comboTitle}>Sestina #{index+1}</Text>
            <Text style={styles.comboNumbers}>{combo.numbers?.join(' - ')}</Text>
            <Text style={styles.comboScore}>Punteggio: {combo.combined_score}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ============ ADD EXTRACTION SCREEN ============
function AddExtractionScreen({ navigation }) {
  const [date, setDate] = useState('');
  const [numbers, setNumbers] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!date || numbers.some(n => !n || n < 1 || n > 90)) {
      Alert.alert('Errore', 'Inserisci data e 6 numeri tra 1 e 90');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/extractions`, { date, numbers: numbers.map(Number) });
      Alert.alert('OK', 'Estrazione aggiunta!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile aggiungere');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formHeader}>
        <Text style={styles.sectionTitle}>Nuova Estrazione</Text>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Data (AAAA-MM-GG)</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-07-31" />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>6 Numeri (1-90)</Text>
        <View style={styles.numbersInputRow}>
          {numbers.map((num, index) => (
            <TextInput key={index} style={styles.numberInput} value={num}
              onChangeText={(text) => { const n = [...numbers]; n[index] = text; setNumbers(n); }}
              keyboardType="numeric" maxLength={2} placeholder={String(index+1)} />
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Salvataggio...' : '💾 SALVA ESTRAZIONE'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============ SUBSCRIPTION SCREEN ============
function SubscriptionScreen() {
  const plans = [
    { id: 'weekly', name: 'Settimanale', price: '2.99', days: 7 },
    { id: 'monthly', name: 'Mensile', price: '9.99', days: 30 },
    { id: 'annual', name: 'Annuale', price: '79.99', days: 365 },
  ];
  return (
    <ScrollView style={styles.container}>
      <View style={styles.subscriptionHeader}>
        <Text style={styles.title}>Piani Abbonamento</Text>
        <Text style={styles.subtitle}>✅ 3 giorni di prova gratuita</Text>
      </View>
      {plans.map((plan) => (
        <TouchableOpacity key={plan.id} style={styles.planCard}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>€{plan.price} - {plan.days}gg</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ============ MAIN APP ============
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1a237e' }, headerTintColor: '#fff' }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registrazione' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'SuperEnalotto Analyzer', headerLeft: () => null }} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'Analisi' }} />
        <Stack.Screen name="Results" component={ResultsScreen} options={{ title: 'Risultati' }} />
        <Stack.Screen name="AddExtraction" component={AddExtractionScreen} options={{ title: 'Nuova Estrazione' }} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Abbonamento' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a237e', padding: 40, alignItems: 'center' },
  loginHeader: { backgroundColor: '#1a237e', padding: 60, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  titleSmall: { fontSize: 22, fontWeight: '300', color: '#fff' },
  subtitle: { fontSize: 14, color: '#b3b3b3', marginTop: 10 },
  loginForm: { padding: 30, marginTop: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fff' },
  linkText: { textAlign: 'center', marginTop: 20, color: '#1a237e', fontSize: 14 },
  logoutButton: { backgroundColor: '#f44336', marginHorizontal: 15, marginTop: 10, padding: 18, borderRadius: 12, alignItems: 'center' },
  statsBadge: { backgroundColor: '#e8eaf6', padding: 15, marginHorizontal: 15, marginTop: -10, borderRadius: 10, alignItems: 'center' },
  statsBadgeText: { fontSize: 18, fontWeight: 'bold', color: '#1a237e' },
  statsBadgeSubtext: { fontSize: 12, color: '#666', marginTop: 3 },
  features: { padding: 20, backgroundColor: '#fff', margin: 15, borderRadius: 15 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#1a237e' },
  featureItem: { fontSize: 15, paddingVertical: 6 },
  analyzeButton: { backgroundColor: '#4caf50', marginHorizontal: 15, marginTop: 10, padding: 18, borderRadius: 12, alignItems: 'center' },
  addButton: { backgroundColor: '#ff9800', marginHorizontal: 15, marginTop: 10, padding: 18, borderRadius: 12, alignItems: 'center' },
  subscriptionButton: { backgroundColor: '#2196f3', marginHorizontal: 15, marginTop: 10, padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { textAlign: 'center', marginTop: 20, color: '#666', marginBottom: 30 },
  analysisHeader: { padding: 20, backgroundColor: '#fff', margin: 15, borderRadius: 12 },
  description: { fontSize: 14, color: '#666', marginTop: 10 },
  loadingContainer: { alignItems: 'center', padding: 60 },
  loadingText: { fontSize: 18, marginTop: 20 },
  resultHeader: { backgroundColor: '#1a237e', padding: 25, alignItems: 'center' },
  resultTitle: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 20 },
  numbersGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  numberBadge: { backgroundColor: '#fff', borderRadius: 15, padding: 12, alignItems: 'center', width: 65 },
  rankText: { fontSize: 10, color: '#666' },
  numberText: { fontSize: 24, fontWeight: 'bold', color: '#1a237e' },
  combinationsSection: { padding: 15 },
  comboCard: { backgroundColor: '#fff', padding: 18, marginVertical: 6, borderRadius: 12 },
  comboTitle: { fontSize: 16, fontWeight: 'bold' },
  comboNumbers: { fontSize: 18, color: '#333', marginTop: 5 },
  comboScore: { fontSize: 14, color: '#4caf50', marginTop: 5 },
  formHeader: { padding: 20, backgroundColor: '#fff', margin: 15, borderRadius: 12 },
  formGroup: { padding: 15, backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, borderRadius: 12 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#1a237e' },
  numbersInputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  numberInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 18, width: 48, textAlign: 'center' },
  submitButton: { backgroundColor: '#ff9800', margin: 15, padding: 18, borderRadius: 12, alignItems: 'center' },
  subscriptionHeader: { padding: 30, alignItems: 'center', backgroundColor: '#1a237e' },
  planCard: { backgroundColor: '#fff', marginHorizontal: 15, marginTop: 15, padding: 20, borderRadius: 12 },
  planName: { fontSize: 20, fontWeight: 'bold' },
  planPrice: { fontSize: 16, color: '#666', marginTop: 5 },
});