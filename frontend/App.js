import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Vibration, Dimensions, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BarChart } from 'react-native-chart-kit';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const Stack = createStackNavigator();
const API_BASE_URL = 'https://superenalotto-api.onrender.com';

// ============ TEMA ============
export const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const lightTheme = {
  name: 'light',
  bg: '#f5f5f5',
  card: '#ffffff',
  text: '#1a237e',
  subtext: '#666666',
  header: '#1a237e',
  input: '#ffffff',
  inputText: '#000000',
  border: '#cccccc',
  badge: '#e8eaf6',
  badgeText: '#1a237e',
  chartBg: '#1a237e',
  chartGradient: '#283593',
};

const darkTheme = {
  name: 'dark',
  bg: '#121212',
  card: '#1e1e1e',
  text: '#bb86fc',
  subtext: '#aaaaaa',
  header: '#000000',
  input: '#333333',
  inputText: '#ffffff',
  border: '#444444',
  badge: '#1e1e1e',
  badgeText: '#bb86fc',
  chartBg: '#000000',
  chartGradient: '#1a1a2e',
};

// ============ NOTIFICHE ============
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldVibrate: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Notifiche non abilitate');
      return;
    }
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      console.log('Push token:', token.data);
    } catch (e) {
      console.log('Errore token push:', e);
    }
  }
}

async function scheduleAnalysisNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔮 SuperEnalotto Analyzer',
      body: 'Nuova analisi disponibile! Scopri i top 9 numeri.',
    },
    trigger: { seconds: 2 },
  });
}

// ============ SPLASH SCREEN ============
function SplashScreen({ navigation }) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    registerForPushNotificationsAsync();
    setTimeout(async () => {
      const user = await AsyncStorage.getItem('user');
      navigation.replace(user ? 'Home' : 'Login');
    }, 2000);
  }, []);

  return (
    <View style={[styles.splashContainer, { backgroundColor: theme.header }]}>
      <Text style={styles.splashEmoji}>🎯</Text>
      <Text style={styles.splashTitle}>SuperEnalotto</Text>
      <Text style={styles.splashSubtitle}>Analyzer</Text>
      <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
      <Text style={styles.splashLoading}>Caricamento in corso...</Text>
    </View>
  );
}

// ============ LOGIN SCREEN ============
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => { checkLogin(); }, []);
  const checkLogin = async () => {
    const user = await AsyncStorage.getItem('user');
    if (user) navigation.replace('Home');
  };

  const handleLogin = async () => {
    if (!email || !password) { Vibration.vibrate(200); Alert.alert('Errore', 'Inserisci email e password'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
      if (res.data.success) { await AsyncStorage.setItem('user', JSON.stringify(res.data)); navigation.replace('Home'); }
    } catch (e) { Vibration.vibrate([0,100,100,100]); Alert.alert('Errore', 'Credenziali non valide'); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.loginHeader, { backgroundColor: theme.header }]}>
        <Text style={styles.loginIcon}>🎯</Text>
        <Text style={styles.title}>SuperEnalotto</Text>
        <Text style={styles.titleSmall}>Analyzer</Text>
        <Text style={styles.subtitle}>Accedi per continuare</Text>
      </View>
      <View style={styles.loginForm}>
        <View style={styles.inputRow}>
          <Text style={styles.inputIcon}>📧</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} 
            placeholder="Email" value={email} onChangeText={setEmail} 
            keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} 
            placeholder="Password" value={password} onChangeText={setPassword} 
            secureTextEntry={!showPassword} placeholderTextColor="#999" />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? '⏳ Accesso...' : '🔓 ACCEDI'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.linkText, { color: theme.text }]}>📝 Non hai un account? Registrati</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============ REGISTER SCREEN ============
function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const handleRegister = async () => {
    if (!email || !password) { Vibration.vibrate(200); Alert.alert('Errore', 'Inserisci email e password'); return; }
    if (password.length < 4) { Alert.alert('Errore', 'Password minima 4 caratteri'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, { email, password });
      if (res.data.success) { Alert.alert('OK', 'Registrazione completata! Effettua il login.'); navigation.goBack(); }
    } catch (e) { Vibration.vibrate([0,100,100,100]); Alert.alert('Errore', e.response?.data?.error || 'Registrazione fallita'); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.loginHeader, { backgroundColor: theme.header }]}>
        <Text style={styles.loginIcon}>📝</Text>
        <Text style={styles.title}>Registrazione</Text>
        <Text style={styles.subtitle}>Crea il tuo account</Text>
      </View>
      <View style={styles.loginForm}>
        <View style={styles.inputRow}>
          <Text style={styles.inputIcon}>📧</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} 
            placeholder="Email" value={email} onChangeText={setEmail} 
            keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} 
            placeholder="Password (min 4)" value={password} onChangeText={setPassword} 
            secureTextEntry={!showPassword} placeholderTextColor="#999" />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.loginBtn} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? '⏳ Registrazione...' : '✅ REGISTRATI'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.linkText, { color: theme.text }]}>🔙 Hai già un account? Accedi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============ HOME SCREEN ============
function HomeScreen({ navigation }) {
  const [totalExtractions, setTotalExtractions] = useState(null);
  const [user, setUser] = useState(null);
  const { isDark, setIsDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => { fetchStats(); loadUser(); }, []);
  const loadUser = async () => { const u = await AsyncStorage.getItem('user'); if (u) setUser(JSON.parse(u)); };
  const fetchStats = async () => { try { const r = await axios.get(`${API_BASE_URL}/api/stats`); setTotalExtractions(r.data.total_extractions); } catch (e) {} };
  const handleLogout = async () => { await AsyncStorage.removeItem('user'); navigation.replace('Login'); };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={styles.headerIcon}>🎯</Text>
        <Text style={styles.title}>SuperEnalotto Analyzer</Text>
        {user && <Text style={styles.welcomeText}>👋 Benvenuto, {user.email}</Text>}
        <Text style={styles.subtitle}>Analisi statistica - 14 fattori</Text>
      </View>
      <View style={[styles.statsBadge, { backgroundColor: theme.badge }]}>
        <Text style={styles.statsBadgeIcon}>📊</Text>
        <Text style={[styles.statsBadgeText, { color: theme.badgeText }]}>{totalExtractions ? totalExtractions.toLocaleString() : '...'} estrazioni analizzate</Text>
        <Text style={styles.statsBadgeSubtext}>📅 dal 1997 ad oggi</Text>
      </View>
      <View style={styles.menuGrid}>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Analysis')}><Text style={styles.menuIcon}>🔮</Text><Text style={[styles.menuText, { color: theme.text }]}>Nuova Analisi</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('ExtractionList')}><Text style={styles.menuIcon}>📋</Text><Text style={[styles.menuText, { color: theme.text }]}>Archivio Estrazioni</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('AddExtraction')}><Text style={styles.menuIcon}>➕</Text><Text style={[styles.menuText, { color: theme.text }]}>Aggiungi Estrazione</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Subscription')}><Text style={styles.menuIcon}>💳</Text><Text style={[styles.menuText, { color: theme.text }]}>Abbonamento</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => setIsDark(!isDark)}>
          <Text style={styles.menuIcon}>{isDark ? '☀️' : '🌙'}</Text>
          <Text style={[styles.menuText, { color: theme.text }]}>{isDark ? 'Tema Chiaro' : 'Tema Scuro'}</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.features, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ Fattori di Analisi</Text>
        <View style={styles.featureGrid}>
          {['🎯 1-90','📊 Decine','🔥 Hot/Cold','📈 C/E','⏱️ Ritardi','💪 Forza','✅ Stato','💯 Punteggio'].map((f,i)=>(<View key={i} style={[styles.featureBadge, { backgroundColor: theme.badge }]}><Text style={[styles.featureBadgeText, { color: theme.badgeText }]}>{f}</Text></View>))}
        </View>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.buttonText}>🚪 LOGOUT</Text></TouchableOpacity>
      <Text style={[styles.footer, { color: theme.subtext }]}>🆓 3 giorni di prova gratuita</Text>
    </ScrollView>
  );
}

// ============ ANALYSIS SCREEN ============
function AnalysisScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const performAnalysis = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/analyze`, {});
      Vibration.vibrate([0,50,50,50,50,50,100,50,200]);
      scheduleAnalysisNotification();
      navigation.navigate('Results', { analysis: res.data });
    } catch (e) { Vibration.vibrate(500); Alert.alert('Errore', 'Analisi fallita'); }
    finally { setLoading(false); }
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.analysisHeader, { backgroundColor: theme.card }]}>
        <Text style={styles.analysisIcon}>🔮</Text>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Analisi Statistica</Text>
        <Text style={[styles.description, { color: theme.subtext }]}>Analizza 90 numeri con 14 fattori e genera le migliori 10 sestine.</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1a237e" /><Text style={[styles.loadingText, { color: theme.text }]}>🔄 Analisi in corso...</Text><Text style={styles.loadingSubtext}>Elaborazione 14 fattori statistici</Text></View>
      ) : (
        <TouchableOpacity style={styles.bigAnalyzeButton} onPress={performAnalysis}><Text style={styles.bigButtonIcon}>🔮</Text><Text style={styles.bigButtonText}>AVVIA ANALISI COMPLETA</Text><Text style={styles.bigButtonSubText}>14 fattori • 90 numeri • 10 sestine</Text></TouchableOpacity>
      )}
    </View>
  );
}

// ============ RESULTS SCREEN ============
function ResultsScreen({ route }) {
  const { analysis } = route.params || {};
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => { Vibration.vibrate([0,100,50,100,50,100,200]); }, []);
  if (!analysis) return <View style={[styles.container, { backgroundColor: theme.bg }]}><Text>Nessun risultato</Text></View>;
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.resultHeader, { backgroundColor: theme.header }]}>
        <Text style={styles.resultIcon}>🏆</Text>
        <Text style={styles.resultTitle}>Top 9 Numeri</Text>
        <View style={styles.numbersGrid}>
          {analysis.top_9_numeri?.map((num, index) => (
            <View key={index} style={[styles.numberBadge, index<3 && styles.topBadge]}>
              <Text style={styles.rankText}>#{index+1}</Text>
              <Text style={styles.numberText}>{num}</Text>
              {index===0 && <Text style={styles.medalIcon}>🥇</Text>}
              {index===1 && <Text style={styles.medalIcon}>🥈</Text>}
              {index===2 && <Text style={styles.medalIcon}>🥉</Text>}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}><Text style={styles.statIcon}>🔥</Text><Text style={[styles.statValue, { color: theme.text }]}>{analysis.statistiche?.numeri_hot}</Text><Text style={styles.statLabel}>Hot</Text></View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}><Text style={styles.statIcon}>❄️</Text><Text style={[styles.statValue, { color: theme.text }]}>{analysis.statistiche?.numeri_cold}</Text><Text style={styles.statLabel}>Cold</Text></View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}><Text style={styles.statIcon}>⭐</Text><Text style={[styles.statValue, { color: theme.text }]}>{analysis.statistiche?.punteggio_massimo}</Text><Text style={styles.statLabel}>Max</Text></View>
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 Frequenza Top 9</Text>
        {analysis.top_9_numeri && analysis.analisi_dettagliata && (
          <BarChart
            data={{
              labels: analysis.top_9_numeri.slice(0, 9).map(n => String(n)),
              datasets: [{
                data: analysis.top_9_numeri.slice(0, 9).map(n => {
                  const found = analysis.analisi_dettagliata?.find(a => a.identificativo === n);
                  return found?.frequenza_recente || 0;
                })
              }]
            }}
            width={Dimensions.get('window').width - 30}
            height={200}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: theme.chartBg,
              backgroundGradientFrom: theme.chartBg,
              backgroundGradientTo: theme.chartGradient,
              decimalCount: 0,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              barPercentage: 0.6,
            }}
            style={{ borderRadius: 12, marginHorizontal: 15, marginBottom: 15 }}
          />
        )}
      </View>

      <View style={styles.combinationsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🎲 Migliori Sestine</Text>
        {analysis.migliori_sestine?.slice(0,10).map((combo, index) => (
          <View key={index} style={[styles.comboCard, { backgroundColor: theme.card }, index===0 && styles.bestCombo]}>
            <Text style={[styles.comboTitle, { color: theme.text }]}>{index===0?'🥇 ':index===1?'🥈 ':index===2?'🥉 ':''}Sestina #{index+1}</Text>
            <Text style={[styles.comboNumbers, { color: theme.inputText }]}>{combo.numbers?.join(' - ')}</Text>
            <Text style={styles.comboScore}>⭐ Punteggio: {combo.combined_score}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ============ EXTRACTION LIST SCREEN ============
function ExtractionListScreen() {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => { fetchExtractions(); }, []);
  const fetchExtractions = async () => {
    try { const r = await axios.get(`${API_BASE_URL}/api/extractions?limit=50`); setExtractions(r.data); }
    catch (e) { Alert.alert('Errore', 'Impossibile caricare archivio'); }
    finally { setLoading(false); }
  };
  if (loading) return <View style={[styles.container, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color="#1a237e" style={{marginTop:100}} /><Text style={{textAlign:'center',marginTop:20, color: theme.text}}>Caricamento archivio...</Text></View>;
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.listHeader, { backgroundColor: theme.card }]}><Text style={[styles.sectionTitle, { color: theme.text }]}>📋 Archivio Estrazioni</Text><Text style={[styles.description, { color: theme.subtext }]}>Ultime {extractions.length} estrazioni</Text></View>
      {extractions.map((ext, i) => (
        <View key={i} style={[styles.extractionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.extractionDate, { color: theme.text }]}>📅 {ext.extraction_date}</Text>
          <Text style={[styles.extractionNumbers, { color: theme.inputText }]}>🎱 {ext.n1} - {ext.n2} - {ext.n3} - {ext.n4} - {ext.n5} - {ext.n6}</Text>
          {ext.jolly && <Text style={styles.extractionExtra}>⭐ Jolly: {ext.jolly}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

// ============ ADD EXTRACTION SCREEN ============
function AddExtractionScreen({ navigation }) {
  const [date, setDate] = useState('');
  const [numbers, setNumbers] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const handleSubmit = async () => {
    if (!date || numbers.some(n => !n || n < 1 || n > 90)) { Vibration.vibrate(200); Alert.alert('Errore', 'Inserisci data e 6 numeri tra 1 e 90'); return; }
    setLoading(true);
    try { await axios.post(`${API_BASE_URL}/api/extractions`, { date, numbers: numbers.map(Number) }); Vibration.vibrate([0,50,50,50,100]); Alert.alert('OK', 'Estrazione aggiunta!'); navigation.goBack(); }
    catch (e) { Vibration.vibrate(500); Alert.alert('Errore', 'Impossibile aggiungere'); }
    finally { setLoading(false); }
  };
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.formHeader, { backgroundColor: theme.card }]}><Text style={styles.formIcon}>➕</Text><Text style={[styles.sectionTitle, { color: theme.text }]}>Nuova Estrazione</Text></View>
      <View style={[styles.formGroup, { backgroundColor: theme.card }]}><Text style={[styles.label, { color: theme.text }]}>📅 Data (AAAA-MM-GG)</Text><TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} value={date} onChangeText={setDate} placeholder="2026-08-01" placeholderTextColor="#999" /></View>
      <View style={[styles.formGroup, { backgroundColor: theme.card }]}><Text style={[styles.label, { color: theme.text }]}>🎱 6 Numeri (1-90)</Text>
        <View style={styles.numbersInputRow}>{numbers.map((n,i)=>(<TextInput key={i} style={[styles.numberInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} value={n} onChangeText={t=>{let m=[...numbers];m[i]=t;setNumbers(m);}} keyboardType="numeric" maxLength={2} placeholder={String(i+1)} placeholderTextColor="#999" />))}</View>
      </View>
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}><Text style={styles.buttonText}>{loading?'⏳ Salvataggio...':'💾 SALVA ESTRAZIONE'}</Text></TouchableOpacity>
    </ScrollView>
  );
}

// ============ SUBSCRIPTION SCREEN ============
function SubscriptionScreen() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.subscriptionHeader, { backgroundColor: theme.header }]}><Text style={styles.subscriptionIcon}>💎</Text><Text style={styles.title}>Piani Abbonamento</Text><Text style={styles.subtitle}>✅ 3 giorni di prova gratuita</Text></View>
      {[{id:'weekly',name:'📅 Settimanale',price:'2.99',days:7,color:'#4caf50'},{id:'monthly',name:'📅 Mensile',price:'9.99',days:30,color:'#2196f3'},{id:'annual',name:'📅 Annuale',price:'79.99',days:365,color:'#9c27b0'}].map(p=>(
        <TouchableOpacity key={p.id} style={[styles.planCard,{borderLeftColor:p.color, backgroundColor: theme.card}]}><View style={styles.planInfo}><Text style={[styles.planName, { color: theme.text }]}>{p.name}</Text><Text style={[styles.planDuration, { color: theme.subtext }]}>⏱️ {p.days} giorni</Text></View><View style={styles.planPriceContainer}><Text style={[styles.planPrice,{color:p.color}]}>€{p.price}</Text></View></TouchableOpacity>
      ))}
      <View style={[styles.trialInfo, { backgroundColor: theme.badge }]}><Text style={styles.trialText}>🆓 3 giorni di prova gratuita</Text><Text style={styles.trialSubtext}>Nessun impegno, disdici quando vuoi</Text></View>
    </ScrollView>
  );
}

// ============ MAIN APP ============
export default function App() {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ 
          headerStyle: { backgroundColor: isDark ? '#000' : '#1a237e' }, 
          headerTintColor: '#fff' 
        }}>
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: '📝 Registrazione' }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '🏠 Home', headerLeft: () => null }} />
          <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: '🔮 Analisi' }} />
          <Stack.Screen name="Results" component={ResultsScreen} options={{ title: '🏆 Risultati' }} />
          <Stack.Screen name="ExtractionList" component={ExtractionListScreen} options={{ title: '📋 Archivio' }} />
          <Stack.Screen name="AddExtraction" component={AddExtractionScreen} options={{ title: '➕ Nuova Estrazione' }} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: '💎 Abbonamento' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1 },
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashEmoji: { fontSize: 80, marginBottom: 10 },
  splashTitle: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  splashSubtitle: { fontSize: 20, color: '#b3b3b3', marginTop: 5 },
  splashLoading: { color: '#fff', marginTop: 20, fontSize: 14 },
  loginHeader: { padding: 60, alignItems: 'center' },
  loginIcon: { fontSize: 60, marginBottom: 10 },
  loginForm: { padding: 30, marginTop: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  inputIcon: { fontSize: 20, marginRight: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  eyeButton: { padding: 10 },
  eyeIcon: { fontSize: 22 },
  loginBtn: { backgroundColor: '#4caf50', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  linkText: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  header: { padding: 30, alignItems: 'center' },
  headerIcon: { fontSize: 50, marginBottom: 5 },
  welcomeText: { fontSize: 12, color: '#b3b3b3', marginTop: 5 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, gap: 10 },
  menuItem: { borderRadius: 15, padding: 20, alignItems: 'center', width: '47%', elevation: 3 },
  menuIcon: { fontSize: 35, marginBottom: 8 },
  menuText: { fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  featureBadgeText: { fontSize: 12, fontWeight: '500' },
  statsBadge: { padding: 15, marginHorizontal: 15, marginTop: -10, borderRadius: 10, alignItems: 'center' },
  statsBadgeIcon: { fontSize: 25 },
  statsBadgeText: { fontSize: 18, fontWeight: 'bold' },
  statsBadgeSubtext: { fontSize: 12, color: '#666', marginTop: 3 },
  features: { padding: 20, margin: 15, borderRadius: 15 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  analysisIcon: { fontSize: 60, textAlign: 'center', marginBottom: 10 },
  bigAnalyzeButton: { backgroundColor: '#4caf50', margin: 20, padding: 30, borderRadius: 20, alignItems: 'center', elevation: 5 },
  bigButtonIcon: { fontSize: 50, marginBottom: 10 },
  bigButtonText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  bigButtonSubText: { color: '#e0e0e0', fontSize: 12, marginTop: 5 },
  resultIcon: { fontSize: 50, marginBottom: 10 },
  topBadge: { borderWidth: 2, borderColor: '#ffd700' },
  medalIcon: { fontSize: 16, position: 'absolute', top: -10, right: -5 },
  bestCombo: { borderWidth: 2, borderColor: '#ffd700' },
  chartSection: { padding: 15, marginBottom: 15 },
  listHeader: { padding: 20, margin: 15, borderRadius: 12, alignItems: 'center' },
  extractionCard: { marginHorizontal: 15, marginBottom: 8, padding: 15, borderRadius: 10, elevation: 2 },
  extractionDate: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  extractionNumbers: { fontSize: 18, fontWeight: '500' },
  extractionExtra: { fontSize: 12, color: '#666', marginTop: 3 },
  formIcon: { fontSize: 50, textAlign: 'center', marginBottom: 10 },
  subscriptionIcon: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 28