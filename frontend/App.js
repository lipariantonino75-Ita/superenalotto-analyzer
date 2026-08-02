import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Vibration, Dimensions, useColorScheme, Platform, BackHandler } from 'react-native';
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
  name: 'light', bg: '#f5f5f5', card: '#ffffff', text: '#1a237e', subtext: '#666666',
  header: '#1a237e', input: '#ffffff', inputText: '#000000', border: '#cccccc',
  badge: '#e8eaf6', badgeText: '#1a237e', chartBg: '#1a237e', chartGradient: '#283593',
};

const darkTheme = {
  name: 'dark', bg: '#121212', card: '#1e1e1e', text: '#bb86fc', subtext: '#aaaaaa',
  header: '#000000', input: '#333333', inputText: '#ffffff', border: '#444444',
  badge: '#1e1e1e', badgeText: '#bb86fc', chartBg: '#000000', chartGradient: '#1a1a2e',
};

// ============ NOTIFICHE ============
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldVibrate: true }),
});

async function registerForPushNotificationsAsync() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
    } catch (e) {}
  }
}

async function scheduleAnalysisNotification() {
  await Notifications.scheduleNotificationAsync({
    content: { title: '🔮 SuperEnalotto Analyzer', body: 'Nuova analisi disponibile! Scopri i top 9 numeri.' },
    trigger: { seconds: 2 },
  });
}

// ============ SPLASH ============
function SplashScreen({ navigation }) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  useEffect(() => {
    registerForPushNotificationsAsync();
    setTimeout(async () => {
      const termsAccepted = await AsyncStorage.getItem('termsAccepted');
      const user = await AsyncStorage.getItem('user');
      if (!termsAccepted) {
        navigation.replace('Terms');
      } else if (user) {
        navigation.replace('Home');
      } else {
        navigation.replace('Login');
      }
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

// ============ TERMINI ============
function TermsScreen({ navigation }) {
  const [isMinor, setIsMinor] = useState(null);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const handleAccept = async () => {
    if (isMinor === null) {
      Vibration.vibrate(200);
      Alert.alert('⚠️ Età richiesta', 'Seleziona se sei maggiorenne o minorenne per continuare.');
      return;
    }
    await AsyncStorage.setItem('termsAccepted', 'true');
    await AsyncStorage.setItem('isAdult', isMinor ? 'false' : 'true');
    if (isMinor) {
      Alert.alert('🔞 Attenzione', 'Come minorenne, puoi usare l\'app solo per scopi statistici ed educativi. Il gioco d\'azzardo è vietato ai minori di 18 anni.', [{ text: 'Ho capito', onPress: () => navigation.replace('Login') }]);
    } else {
      navigation.replace('Login');
    }
  };

  const handleRefuse = () => {
    Alert.alert('Accesso negato', 'Devi accettare i termini per utilizzare l\'app.', [
      { text: 'Riprova', style: 'cancel' },
      { text: 'Esci', onPress: () => BackHandler.exitApp() }
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.loginHeader, { backgroundColor: theme.header }]}>
        <Text style={styles.loginIcon}>📜</Text>
        <Text style={styles.title}>Termini di Utilizzo</Text>
        <Text style={styles.subtitle}>Leggi e accetta per continuare</Text>
      </View>

      <View style={[styles.termsCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.termsTitle, { color: theme.text }]}>📋 Condizioni d'uso</Text>
        <Text style={[styles.termsText, { color: theme.subtext }]}>Benvenuto in SuperEnalotto Analyzer. Utilizzando questa app, accetti i seguenti termini:</Text>
        
        <Text style={[styles.termsSubtitle, { color: theme.text }]}>1. Scopo dell'App</Text>
        <Text style={[styles.termsText, { color: theme.subtext }]}>Questa app fornisce analisi statistiche sui numeri del SuperEnalotto a scopo informativo e di intrattenimento. Non garantisce vincite e non costituisce un servizio di consulenza per il gioco d'azzardo.</Text>

        <Text style={[styles.termsSubtitle, { color: theme.text }]}>2. Gioco Responsabile</Text>
        <Text style={[styles.termsText, { color: theme.subtext }]}>Il gioco d'azzardo può causare dipendenza. Gioca in modo responsabile e non superare mai i tuoi limiti. Se hai problemi con il gioco, contatta il numero verde 800 558 822.</Text>

        <Text style={[styles.termsSubtitle, { color: theme.text }]}>3. Età minima</Text>
        <Text style={[styles.termsText, { color: theme.subtext }]}>In Italia, il gioco d'azzardo è vietato ai minori di 18 anni. Se sei minorenne, puoi utilizzare l'app solo per scopi statistici ed educativi, con il consenso di un genitore.</Text>

        <Text style={[styles.termsSubtitle, { color: theme.text }]}>4. Privacy</Text>
        <Text style={[styles.termsText, { color: theme.subtext }]}>I tuoi dati (email e password) sono utilizzati solo per l'accesso all'app. Non condividiamo i tuoi dati con terze parti. Le analisi sono anonime.</Text>

        <Text style={[styles.termsSubtitle, { color: theme.text }]}>5. Limitazione di responsabilità</Text>
        <Text style={[styles.termsText, { color: theme.subtext }]}>L'app non si assume responsabilità per eventuali perdite economiche derivanti dall'uso delle informazioni fornite. Le analisi sono basate su dati statistici e non costituiscono previsioni certe.</Text>
      </View>

      <View style={[styles.ageCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.termsSubtitle, { color: theme.text }]}>🎂 Età dell'utente</Text>
        <View style={styles.ageRow}>
          <TouchableOpacity style={[styles.ageButton, { backgroundColor: isMinor === false ? '#4caf50' : theme.badge }]} onPress={() => setIsMinor(false)}>
            <Text style={[styles.ageButtonText, { color: isMinor === false ? '#fff' : theme.text }]}>✅ Maggiorenne</Text>
            <Text style={[styles.ageSubtext, { color: isMinor === false ? '#e0e0e0' : theme.subtext }]}>18+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ageButton, { backgroundColor: isMinor === true ? '#ff9800' : theme.badge }]} onPress={() => setIsMinor(true)}>
            <Text style={[styles.ageButtonText, { color: isMinor === true ? '#fff' : theme.text }]}>🔞 Minorenne</Text>
            <Text style={[styles.ageSubtext, { color: isMinor === true ? '#e0e0e0' : theme.subtext }]}>&lt;18</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.refuseButton} onPress={handleRefuse}>
          <Text style={styles.buttonText}>❌ RIFIUTA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.buttonText}>✅ ACCETTA</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.footer, { color: theme.subtext }]}>⚖️ Accedendo accetti i termini del servizio</Text>
    </ScrollView>
  );
}

// ============ LOGIN ============
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

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
        <View style={styles.inputRow}><Text style={styles.inputIcon}>📧</Text><TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" /></View>
        <View style={styles.inputRow}><Text style={styles.inputIcon}>🔒</Text><TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholderTextColor="#999" /><TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}><Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text></TouchableOpacity></View>
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}><Text style={styles.buttonText}>{loading ? '⏳ Accesso...' : '🔓 ACCEDI'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}><Text style={[styles.linkText, { color: theme.text }]}>📝 Non hai un account? Registrati</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ============ REGISTER ============
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
      <View style={[styles.loginHeader, { backgroundColor: theme.header }]}><Text style={styles.loginIcon}>📝</Text><Text style={styles.title}>Registrazione</Text><Text style={styles.subtitle}>Crea il tuo account</Text></View>
      <View style={styles.loginForm}>
        <View style={styles.inputRow}><Text style={styles.inputIcon}>📧</Text><TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" /></View>
        <View style={styles.inputRow}><Text style={styles.inputIcon}>🔒</Text><TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} placeholder="Password (min 4)" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholderTextColor="#999" /><TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}><Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text></TouchableOpacity></View>
        <TouchableOpacity style={styles.loginBtn} onPress={handleRegister} disabled={loading}><Text style={styles.buttonText}>{loading ? '⏳ Registrazione...' : '✅ REGISTRATI'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={[styles.linkText, { color: theme.text }]}>🔙 Hai già un account? Accedi</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ============ HOME ============
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
      <View style={[styles.header, { backgroundColor: theme.header }]}><Text style={styles.headerIcon}>🎯</Text><Text style={styles.title}>SuperEnalotto Analyzer</Text>{user && <Text style={styles.welcomeText}>👋 Benvenuto, {user.email}</Text>}<Text style={styles.subtitle}>Analisi statistica - 10 fattori</Text></View>
      <View style={[styles.statsBadge, { backgroundColor: theme.badge }]}><Text style={styles.statsBadgeIcon}>📊</Text><Text style={[styles.statsBadgeText, { color: theme.badgeText }]}>{totalExtractions ? totalExtractions.toLocaleString() : '...'} estrazioni analizzate</Text><Text style={styles.statsBadgeSubtext}>📅 dal 1997 ad oggi</Text></View>
      <View style={styles.menuGrid}>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Analysis')}><Text style={styles.menuIcon}>🔮</Text><Text style={[styles.menuText, { color: theme.text }]}>Nuova Analisi</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('ExtractionList')}><Text style={styles.menuIcon}>📋</Text><Text style={[styles.menuText, { color: theme.text }]}>Archivio</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('AddExtraction')}><Text style={styles.menuIcon}>➕</Text><Text style={[styles.menuText, { color: theme.text }]}>Aggiungi</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Subscription')}><Text style={styles.menuIcon}>💳</Text><Text style={[styles.menuText, { color: theme.text }]}>Abbonamento</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => setIsDark(!isDark)}><Text style={styles.menuIcon}>{isDark ? '☀️' : '🌙'}</Text><Text style={[styles.menuText, { color: theme.text }]}>{isDark ? 'Chiaro' : 'Scuro'}</Text></TouchableOpacity>
      </View>
      <View style={[styles.features, { backgroundColor: theme.card }]}><Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ Fattori di Analisi</Text><View style={styles.featureGrid}>{['🎯 1-90','📊 Decine','🔥 Hot/Cold','📈 C/E','⏱️ Ritardi','💪 Forza','🎯 LeggeTerzo','🕵️ Spia','💯 Punteggio'].map((f,i)=>(<View key={i} style={[styles.featureBadge, { backgroundColor: theme.badge }]}><Text style={[styles.featureBadgeText, { color: theme.badgeText }]}>{f}</Text></View>))}</View></View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.buttonText}>🚪 LOGOUT</Text></TouchableOpacity>
      <Text style={[styles.footer, { color: theme.subtext }]}>🆓 3 giorni di prova gratuita</Text>
    </ScrollView>
  );
}

// ============ ANALYSIS ============
function AnalysisScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('all');
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const periods = [
    { id: '1m', name: '📅 Ultimo mese' },
    { id: '6m', name: '📅 Ultimi 6 mesi' },
    { id: '1y', name: '📅 Ultimo anno' },
    { id: 'all', name: '📅 Dal 1997' },
  ];
  const performAnalysis = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/analyze`, { period });
      Vibration.vibrate([0,50,50,50,50,50,100,50,200]);
      scheduleAnalysisNotification();
      navigation.navigate('Results', { analysis: res.data, period });
    } catch (e) { Vibration.vibrate(500); Alert.alert('Errore', 'Analisi fallita'); }
    finally { setLoading(false); }
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.analysisHeader, { backgroundColor: theme.card }]}><Text style={styles.analysisIcon}>🔮</Text><Text style={[styles.sectionTitle, { color: theme.text }]}>Analisi Statistica</Text><Text style={[styles.description, { color: theme.subtext }]}>Seleziona il periodo e analizza 90 numeri con 10 fattori.</Text></View>
      <View style={styles.periodSection}>
        <Text style={[styles.label, { color: theme.text }]}>📅 Periodo di analisi</Text>
        <View style={styles.periodGrid}>
          {periods.map((p) => (
            <TouchableOpacity key={p.id} style={[styles.periodButton, { backgroundColor: period === p.id ? '#1a237e' : theme.card, borderColor: period === p.id ? '#1a237e' : theme.border }]} onPress={() => setPeriod(p.id)}>
              <Text style={[styles.periodButtonText, { color: period === p.id ? '#fff' : theme.text }]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1a237e" /><Text style={[styles.loadingText, { color: theme.text }]}>🔄 Analisi in corso...</Text><Text style={styles.loadingSubtext}>Elaborazione 10 fattori statistici</Text></View>
      ) : (
        <TouchableOpacity style={styles.bigAnalyzeButton} onPress={performAnalysis}>
          <Text style={styles.bigButtonIcon}>🔮</Text><Text style={styles.bigButtonText}>AVVIA ANALISI COMPLETA</Text>
          <Text style={styles.bigButtonSubText}>{period === 'all' ? 'Dal 1997 ad oggi' : `Periodo: ${periods.find(p => p.id === period)?.name}`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============ RESULTS ============
function ResultsScreen({ route }) {
  const { analysis, period } = route.params || {};
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  useEffect(() => { Vibration.vibrate([0,100,50,100,50,100,200]); }, []);
  if (!analysis) return <View style={[styles.container, { backgroundColor: theme.bg }]}><Text>Nessun risultato</Text></View>;
  const periodLabel = period === '1m' ? '(Ultimo mese)' : period === '6m' ? '(Ultimi 6 mesi)' : period === '1y' ? '(Ultimo anno)' : '(Dal 1997)';
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.resultHeader, { backgroundColor: theme.header }]}><Text style={styles.resultIcon}>🏆</Text><Text style={styles.resultTitle}>Top 9 Numeri {periodLabel}</Text>
        <View style={styles.numbersGrid}>{analysis.top_9_numeri?.map((num, index) => (<View key={index} style={[styles.numberBadge, index<3 && styles.topBadge]}><Text style={styles.rankText}>#{index+1}</Text><Text style={styles.numberText}>{num}</Text>{index===0 && <Text style={styles.medalIcon}>🥇</Text>}{index===1 && <Text style={styles.medalIcon}>🥈</Text>}{index===2 && <Text style={styles.medalIcon}>🥉</Text>}</View>))}</View>
      </View>
      <View style={styles.statsSection}><View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}><Text style={styles.statIcon}>🔥</Text><Text style={[styles.statValue, { color: theme.text }]}>{analysis.statistiche?.numeri_hot}</Text><Text style={styles.statLabel}>Hot</Text></View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}><Text style={styles.statIcon}>❄️</Text><Text style={[styles.statValue, { color: theme.text }]}>{analysis.statistiche?.numeri_cold}</Text><Text style={styles.statLabel}>Cold</Text></View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}><Text style={styles.statIcon}>⭐</Text><Text style={[styles.statValue, { color: theme.text }]}>{analysis.statistiche?.punteggio_massimo}</Text><Text style={styles.statLabel}>Max</Text></View>
      </View></View>
      <View style={styles.chartSection}><Text style={[styles.sectionTitle, { color: theme.text }]}>📊 Frequenza Top 9</Text>
        {analysis.top_9_numeri && analysis.analisi_dettagliata && (<BarChart data={{labels: analysis.top_9_numeri.slice(0,9).map(n=>String(n)),datasets:[{data: analysis.top_9_numeri.slice(0,9).map(n=>{const f=analysis.analisi_dettagliata?.find(a=>a.identificativo===n);return f?.frequenza_recente||0;})}]}} width={Dimensions.get('window').width-30} height={200} yAxisLabel="" yAxisSuffix="" chartConfig={{backgroundColor:theme.chartBg,backgroundGradientFrom:theme.chartBg,backgroundGradientTo:theme.chartGradient,decimalCount:0,color:(opacity=1)=>`rgba(76,175,80,${opacity})`,labelColor:(opacity=1)=>`rgba(255,255,255,${opacity})`,barPercentage:0.6}} style={{borderRadius:12,marginHorizontal:15,marginBottom:15}} />)}
      </View>
      <View style={styles.combinationsSection}><Text style={[styles.sectionTitle, { color: theme.text }]}>🎲 Migliori Sestine</Text>
        {analysis.migliori_sestine?.slice(0,10).map((combo,index)=>(<View key={index} style={[styles.comboCard,{backgroundColor:theme.card},index===0&&styles.bestCombo]}><Text style={[styles.comboTitle,{color:theme.text}]}>{index===0?'🥇 ':index===1?'🥈 ':index===2?'🥉 ':''}Sestina #{index+1}</Text><Text style={[styles.comboNumbers,{color:theme.inputText}]}>{combo.numbers?.join(' - ')}</Text><Text style={styles.comboScore}>⭐ Punteggio: {combo.combined_score}</Text></View>))}
      </View>
    </ScrollView>
  );
}

// ============ EXTRACTION LIST ============
function ExtractionListScreen() {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  useEffect(() => { fetchExtractions(); }, []);
  const fetchExtractions = async () => { try { const r = await axios.get(`${API_BASE_URL}/api/extractions?limit=50`); setExtractions(r.data); } catch (e) { Alert.alert('Errore', 'Impossibile caricare archivio'); } finally { setLoading(false); } };
  if (loading) return <View style={[styles.container, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color="#1a237e" style={{marginTop:100}} /><Text style={{textAlign:'center',marginTop:20,color:theme.text}}>Caricamento archivio...</Text></View>;
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.listHeader, { backgroundColor: theme.card }]}><Text style={[styles.sectionTitle, { color: theme.text }]}>📋 Archivio Estrazioni</Text><Text style={[styles.description, { color: theme.subtext }]}>Ultime {extractions.length} estrazioni</Text></View>
      {extractions.map((ext, i) => (<View key={i} style={[styles.extractionCard, { backgroundColor: theme.card }]}><Text style={[styles.extractionDate, { color: theme.text }]}>📅 {ext.extraction_date}</Text><Text style={[styles.extractionNumbers, { color: theme.inputText }]}>🎱 {ext.n1} - {ext.n2} - {ext.n3} - {ext.n4} - {ext.n5} - {ext.n6}</Text>{ext.jolly && <Text style={styles.extractionExtra}>⭐ Jolly: {ext.jolly}</Text>}</View>))}
    </ScrollView>
  );
}

// ============ ADD EXTRACTION ============
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
      <View style={[styles.formGroup, { backgroundColor: theme.card }]}><Text style={[styles.label, { color: theme.text }]}>🎱 6 Numeri (1-90)</Text><View style={styles.numbersInputRow}>{numbers.map((n,i)=>(<TextInput key={i} style={[styles.numberInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} value={n} onChangeText={t=>{let m=[...numbers];m[i]=t;setNumbers(m);}} keyboardType="numeric" maxLength={2} placeholder={String(i+1)} placeholderTextColor="#999" />))}</View></View>
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}><Text style={styles.buttonText}>{loading?'⏳ Salvataggio...':'💾 SALVA ESTRAZIONE'}</Text></TouchableOpacity>
    </ScrollView>
  );
}

// ============ SUBSCRIPTION ============
function SubscriptionScreen() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.subscriptionHeader, { backgroundColor: theme.header }]}><Text style={styles.subscriptionIcon}>💎</Text><Text style={styles.title}>Piani Abbonamento</Text><Text style={styles.subtitle}>✅ 3 giorni di prova gratuita</Text></View>
      {[{id:'weekly',name:'📅 Settimanale',price:'2.99',days:7,color:'#4caf50'},{id:'monthly',name:'📅 Mensile',price:'9.99',days:30,color:'#2196f3'},{id:'annual',name:'📅 Annuale',price:'79.99',days:365,color:'#9c27b0'}].map(p=>(<TouchableOpacity key={p.id} style={[styles.planCard,{borderLeftColor:p.color,backgroundColor:theme.card}]}><View style={styles.planInfo}><Text style={[styles.planName,{color:theme.text}]}>{p.name}</Text><Text style={[styles.planDuration,{color:theme.subtext}]}>⏱️ {p.days} giorni</Text></View><View style={styles.planPriceContainer}><Text style={[styles.planPrice,{color:p.color}]}>€{p.price}</Text></View></TouchableOpacity>))}
      <View style={[styles.trialInfo, { backgroundColor: theme.badge }]}><Text style={styles.trialText