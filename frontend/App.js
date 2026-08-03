import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Vibration, Dimensions, useColorScheme, Platform, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BarChart } from 'react-native-chart-kit';
import * as InAppPurchases from 'expo-in-app-purchases';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const Stack = createStackNavigator();
const API_BASE_URL = 'https://superenalotto-api.onrender.com';

export const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const lightTheme = { name: 'light', bg: '#f5f5f5', card: '#ffffff', text: '#1a237e', subtext: '#666666', header: '#1a237e', input: '#ffffff', inputText: '#000000', border: '#cccccc', badge: '#e8eaf6', badgeText: '#1a237e', chartBg: '#1a237e', chartGradient: '#283593' };
const darkTheme = { name: 'dark', bg: '#121212', card: '#1e1e1e', text: '#bb86fc', subtext: '#aaaaaa', header: '#000000', input: '#333333', inputText: '#ffffff', border: '#444444', badge: '#1e1e1e', badgeText: '#bb86fc', chartBg: '#000000', chartGradient: '#1a1a2e' };

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldVibrate: true }) });

async function registerForPushNotificationsAsync() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') { const { status } = await Notifications.requestPermissionsAsync(); finalStatus = status; }
    if (finalStatus !== 'granted') return;
    try { await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId }); } catch (e) {}
  }
}

async function scheduleAnalysisNotification() {
  await Notifications.scheduleNotificationAsync({ content: { title: 'SuperEnalotto Analyzer', body: 'Nuova analisi disponibile!' }, trigger: { seconds: 2 } });
}

// SPLASH
function SplashScreen({ navigation }) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  useEffect(() => {
    registerForPushNotificationsAsync();
    setTimeout(async () => {
      const termsAccepted = await AsyncStorage.getItem('termsAccepted');
      const user = await AsyncStorage.getItem('user');
      if (!termsAccepted) navigation.replace('Terms');
      else if (user) navigation.replace('Home');
      else navigation.replace('Login');
    }, 2000);
  }, []);
  return (
    <View style={[styles.splashContainer, { backgroundColor: theme.header }]}>
      <Text style={styles.splashEmoji}>🎯</Text><Text style={styles.splashTitle}>SuperEnalotto</Text><Text style={styles.splashSubtitle}>Analyzer</Text>
      <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} /><Text style={styles.splashLoading}>Caricamento...</Text>
    </View>
  );
}

// TERMINI
function TermsScreen({ navigation }) {
  const [isMinor, setIsMinor] = useState(null);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const handleAccept = async () => {
    if (isMinor === null) { Vibration.vibrate(200); Alert.alert('Eta richiesta', 'Seleziona se sei maggiorenne o minorenne.'); return; }
    await AsyncStorage.setItem('termsAccepted', 'true');
    if (isMinor) { Alert.alert('Attenzione', 'Come minorenne, puoi usare l\'app solo per scopi statistici.', [{ text: 'Ho capito', onPress: () => navigation.replace('Login') }]); }
    else { navigation.replace('Login'); }
  };
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.loginHeader, { backgroundColor: theme.header }]}><Text style={styles.loginIcon}>📜</Text><Text style={styles.title}>Termini di Utilizzo</Text><Text style={styles.subtitle}>Leggi e accetta per continuare</Text></View>
      <View style={[styles.termsCard, { backgroundColor: theme.card }]}><Text style={[styles.termsTitle, { color: theme.text }]}>Condizioni d'uso</Text><Text style={[styles.termsText, { color: theme.subtext }]}>Benvenuto in SuperEnalotto Analyzer.</Text><Text style={[styles.termsSubtitle, { color: theme.text }]}>1. Scopo</Text><Text style={[styles.termsText, { color: theme.subtext }]}>Analisi statistiche a scopo informativo.</Text><Text style={[styles.termsSubtitle, { color: theme.text }]}>2. Gioco Responsabile</Text><Text style={[styles.termsText, { color: theme.subtext }]}>Numero verde: 800 558 822.</Text><Text style={[styles.termsSubtitle, { color: theme.text }]}>3. Eta minima</Text><Text style={[styles.termsText, { color: theme.subtext }]}>Vietato ai minori di 18 anni.</Text><Text style={[styles.termsSubtitle, { color: theme.text }]}>4. Privacy</Text><Text style={[styles.termsText, { color: theme.subtext }]}>Dati usati solo per accesso.</Text><Text style={[styles.termsSubtitle, { color: theme.text }]}>5. Responsabilita</Text><Text style={[styles.termsText, { color: theme.subtext }]}>Nessuna garanzia di vincita.</Text></View>
      <View style={[styles.ageCard, { backgroundColor: theme.card }]}><Text style={[styles.termsSubtitle, { color: theme.text }]}>Eta dell'utente</Text><View style={styles.ageRow}><TouchableOpacity style={[styles.ageButton, { backgroundColor: isMinor === false ? '#4caf50' : theme.badge }]} onPress={() => setIsMinor(false)}><Text style={[styles.ageButtonText, { color: isMinor === false ? '#fff' : theme.text }]}>✅ Maggiorenne</Text></TouchableOpacity><TouchableOpacity style={[styles.ageButton, { backgroundColor: isMinor === true ? '#ff9800' : theme.badge }]} onPress={() => setIsMinor(true)}><Text style={[styles.ageButtonText, { color: isMinor === true ? '#fff' : theme.text }]}>🔞 Minorenne</Text></TouchableOpacity></View></View>
      <View style={styles.actionRow}><TouchableOpacity style={styles.refuseButton} onPress={() => Alert.alert('Accesso negato', 'Devi accettare i termini.', [{ text: 'Esci', onPress: () => BackHandler.exitApp() }])}><Text style={styles.buttonText}>❌ RIFIUTA</Text></TouchableOpacity><TouchableOpacity style={styles.acceptButton} onPress={handleAccept}><Text style={styles.buttonText}>✅ ACCETTA</Text></TouchableOpacity></View>
    </ScrollView>
  );
}

// LOGIN
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
    try { const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password }); if (res.data.success) { await AsyncStorage.setItem('user', JSON.stringify(res.data)); navigation.replace('Home'); } }
    catch (e) { Vibration.vibrate([0,100,100,100]); Alert.alert('Errore', 'Credenziali non valide'); }
    finally { setLoading(false); }
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.loginHeader, { backgroundColor: theme.header }]}><Text style={styles.loginIcon}>🎯</Text><Text style={styles.title}>SuperEnalotto</Text><Text style={styles.titleSmall}>Analyzer</Text><Text style={styles.subtitle}>Accedi per continuare</Text></View>
      <View style={styles.loginForm}>
        <View style={styles.inputRow}><Text style={styles.inputIcon}>📧</Text><TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" /></View>
        <View style={styles.inputRow}><Text style={styles.inputIcon}>🔒</Text><TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholderTextColor="#999" /><TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}><Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text></TouchableOpacity></View>
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}><Text style={styles.buttonText}>{loading ? '⏳ Accesso...' : '🔓 ACCEDI'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}><Text style={[styles.linkText, { color: theme.text }]}>📝 Non hai un account? Registrati</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// REGISTER
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
    try { const res = await axios.post(`${API_BASE_URL}/api/auth/register`, { email, password }); if (res.data.success) { Alert.alert('OK', 'Registrazione completata!'); navigation.goBack(); } }
    catch (e) { Vibration.vibrate([0,100,100,100]); Alert.alert('Errore', 'Registrazione fallita'); }
    finally { setLoading(false); }
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.loginHeader, { backgroundColor: theme.header }]}><Text style={styles.loginIcon}>📝</Text><Text style={styles.title}>Registrazione</Text><Text style={styles.subtitle}>Crea il tuo account</Text></View>
      <View style={styles.loginForm}>
        <View style={styles.inputRow}><Text style={styles.inputIcon}>📧</Text><TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" /></View>
        <View style={styles.inputRow}><Text style={styles.inputIcon}>🔒</Text><TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]} placeholder="Password (min 4)" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholderTextColor="#999" /><TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}><Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text></TouchableOpacity></View>
        <TouchableOpacity style={styles.loginBtn} onPress={handleRegister} disabled={loading}><Text style={styles.buttonText}>{loading ? '⏳ Registrazione...' : '✅ REGISTRATI'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={[styles.linkText, { color: theme.text }]}>🔙 Hai gia un account? Accedi</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// HOME CON CALENDARIO
function HomeScreen({ navigation }) {
  const [totalExtractions, setTotalExtractions] = useState(null);
  const [user, setUser] = useState(null);
  const { isDark, setIsDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  useEffect(() => { fetchStats(); loadUser(); }, []);
  const loadUser = async () => { const u = await AsyncStorage.getItem('user'); if (u) setUser(JSON.parse(u)); };
  const fetchStats = async () => { try { const r = await axios.get(`${API_BASE_URL}/api/stats`); setTotalExtractions(r.data.total_extractions); } catch (e) {} };
  const handleLogout = async () => { await AsyncStorage.removeItem('user'); navigation.replace('Login'); };

  const getExtractionDays = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const extractionDays = [2, 4, 5, 6];
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekDays = [];
    const dayNames = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDays.push({ day: dayNames[i], date: date.getDate(), isToday: date.toDateString() === today.toDateString(), isExtractionDay: extractionDays.includes(date.getDay()) });
    }
    return weekDays;
  };
  const weekDays = getExtractionDays();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}><Text style={styles.headerIcon}>🎯</Text><Text style={styles.title}>SuperEnalotto Analyzer</Text>{user && <Text style={styles.welcomeText}>👋 {user.email}</Text>}<Text style={styles.subtitle}>Analisi statistica</Text></View>
      <View style={[styles.statsBadge, { backgroundColor: theme.badge }]}><Text style={styles.statsBadgeIcon}>📊</Text><Text style={[styles.statsBadgeText, { color: theme.badgeText }]}>{totalExtractions ? totalExtractions.toLocaleString() : '...'} estrazioni</Text></View>
      
      <View style={[styles.calendarCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.calendarTitle, { color: theme.text }]}>📅 Prossime Estrazioni</Text>
        <Text style={[styles.calendarSubtitle, { color: theme.subtext }]}>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        <View style={styles.calendarRow}>{weekDays.map((item, index) => (<View key={index} style={styles.calendarDay}><Text style={[styles.calendarDayName, { color: theme.subtext }]}>{item.day}</Text><View style={[styles.calendarDayNumber, item.isToday && styles.calendarToday, item.isExtractionDay && styles.calendarExtraction]}><Text style={[styles.calendarDayText, { color: theme.text }, (item.isToday || item.isExtractionDay) && { color: '#fff', fontWeight: 'bold' }]}>{item.date}</Text></View>{item.isExtractionDay && <Text style={styles.extractionDot}>🎯</Text>}</View>))}</View>
      </View>

      <View style={styles.menuGrid}>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Analysis')}><Text style={styles.menuIcon}>🔮</Text><Text style={[styles.menuText, { color: theme.text }]}>Analisi</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Generator')}><Text style={styles.menuIcon}>🎲</Text><Text style={[styles.menuText, { color: theme.text }]}>Generatore</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('ExtractionList')}><Text style={styles.menuIcon}>📋</Text><Text style={[styles.menuText, { color: theme.text }]}>Archivio</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('AddExtraction')}><Text style={styles.menuIcon}>➕</Text><Text style={[styles.menuText, { color: theme.text }]}>Aggiungi</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Subscription')}><Text style={styles.menuIcon}>💳</Text><Text style={[styles.menuText, { color: theme.text }]}>Abbonamento</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => setIsDark(!isDark)}><Text style={styles.menuIcon}>{isDark ? '☀️' : '🌙'}</Text><Text style={[styles.menuText, { color: theme.text }]}>{isDark ? 'Chiaro' : 'Scuro'}</Text></TouchableOpacity>
      </View>
      <View style={{ height: 30 }} />
      <TouchableOpacity style={[styles.logoutButton, { marginBottom: 50 }]} onPress={handleLogout}><Text style={styles.buttonText}>🚪 LOGOUT</Text></TouchableOpacity>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// ANALYSIS
function AnalysisScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('all');
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const periods = [{ id: '1m', name: '📅 Ultimo mese' },{ id: '6m', name: '📅 Ultimi 6 mesi' },{ id: '1y', name: '📅 Ultimo anno' },{ id: 'all', name: '📅 Dal 1997' }];
  const performAnalysis = async () => { setLoading(true); try { const res = await axios.post(`${API_BASE_URL}/api/analyze`, { period }); Vibration.vibrate([0,50,50,50,50,50,100,50,200]); scheduleAnalysisNotification(); navigation.navigate('Results', { analysis: res.data, period }); } catch (e) { Vibration.vibrate(500); Alert.alert('Errore'); } finally { setLoading(false); } };
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.analysisHeader, { backgroundColor: theme.card }]}><Text style={styles.analysisIcon}>🔮</Text><Text style={[styles.sectionTitle, { color: theme.text }]}>Analisi Statistica</Text></View>
      <View style={styles.periodSection}><Text style={[styles.label, { color: theme.text }]}>Periodo</Text><View style={styles.periodGrid}>{periods.map((p)=>(<TouchableOpacity key={p.id} style={[styles.periodButton,{backgroundColor:period===p.id?'#1a237e':theme.card}]} onPress={()=>setPeriod(p.id)}><Text style={[styles.periodButtonText,{color:period===p.id?'#fff':theme.text}]}>{p.name}</Text></TouchableOpacity>))}</View></View>
      {loading ? (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1a237e" /><Text style={[styles.loadingText,{color:theme.text}]}>Analisi...</Text></View>) : (<TouchableOpacity style={styles.bigAnalyzeButton} onPress={performAnalysis}><Text style={styles.bigButtonIcon}>🔮</Text><Text style={styles.bigButtonText}>AVVIA ANALISI</Text></TouchableOpacity>)}
    </View>
  );
}

// RESULTS
function ResultsScreen({ route, navigation }) {
  const { analysis, period } = route.params || {};
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [generatedCombos, setGeneratedCombos] = useState(null);
  useEffect(() => { Vibration.vibrate([0,100,50,100,50,100,200]); loadFavorites(); if (analysis?.migliori_sestine) { setGeneratedCombos(analysis.migliori_sestine.slice(0, 10)); } }, []);
  const loadFavorites = async () => { const favs = await AsyncStorage.getItem('favorites'); if (favs) setFavorites(JSON.parse(favs)); };
  const toggleFavorite = async (num) => { let newFavs; if (favorites.includes(num)) { newFavs = favorites.filter(f => f !== num); } else { newFavs = [...favorites, num].slice(0, 9); } setFavorites(newFavs); await AsyncStorage.setItem('favorites', JSON.stringify(newFavs)); Vibration.vibrate(50); };
  const generateSestine = () => { Vibration.vibrate([0,50,50,50,100]); if (analysis?.migliori_sestine) { setGeneratedCombos(analysis.migliori_sestine.slice(0, 10)); setShowFavorites(false); } };
  const generateFromFavorites = () => { if (favorites.length >= 6) { Vibration.vibrate([0,50,50,50,100]); const combos = []; for (let i = 0; i < 10; i++) { const shuffled = [...favorites].sort(() => Math.random() - 0.5).slice(0, 6); combos.push({ numbers: shuffled.sort((a,b)=>a-b), combined_score: '★' }); } setGeneratedCombos(combos); setShowFavorites(true); } else { Alert.alert('⚠️', 'Salva almeno 6 numeri preferiti'); } };
  if (!analysis) return <View style={[styles.container,{backgroundColor:theme.bg}]}><Text style={{color:theme.text}}>Nessun risultato</Text></View>;
  const periodLabel = period==='1m'?'(1 mese)':period==='6m'?'(6 mesi)':period==='1y'?'(1 anno)':'';
  const displayCombos = generatedCombos || analysis.migliori_sestine?.slice(0, 10);
  return (
    <ScrollView style={[styles.container,{backgroundColor:theme.bg}]}>
      <View style={[styles.resultHeader,{backgroundColor:theme.header}]}><Text style={styles.resultIcon}>🏆</Text><Text style={styles.resultTitle}>Top 9 Numeri {periodLabel}</Text>
        <View style={styles.circleGrid}>{analysis.top_9_numeri?.map((num, index) => { const isFav = favorites.includes(num); const size = index < 3 ? 70 : 55; const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#1a237e', '#1a237e', '#1a237e', '#1a237e', '#1a237e', '#1a237e']; return (<TouchableOpacity key={index} onPress={() => toggleFavorite(num)}><View style={[styles.circleNumber, { width: size, height: size, borderRadius: size/2, backgroundColor: index < 3 ? colors[index] : theme.card, borderColor: index < 3 ? colors[index] : theme.border, borderWidth: 2 }]}><Text style={[styles.circleText, { color: index < 3 ? '#000' : theme.text, fontSize: index < 3 ? 20 : 16 }]}>{num}</Text>{index < 3 && <Text style={styles.medalCircle}>{index===0?'🥇':index===1?'🥈':'🥉'}</Text>}{isFav && <Text style={styles.favStar}>⭐</Text>}</View></TouchableOpacity>); })}</View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.miniStat,{backgroundColor:theme.card}]}><Text style={styles.miniIcon}>🔥</Text><Text style={[styles.miniValue,{color:'#f44336'}]}>{analysis.statistiche?.numeri_hot}</Text><Text style={[styles.miniLabel,{color:theme.subtext}]}>Hot</Text></View>
        <View style={[styles.miniStat,{backgroundColor:theme.card}]}><Text style={styles.miniIcon}>❄️</Text><Text style={[styles.miniValue,{color:'#2196f3'}]}>{analysis.statistiche?.numeri_cold}</Text><Text style={[styles.miniLabel,{color:theme.subtext}]}>Cold</Text></View>
        <View style={[styles.miniStat,{backgroundColor:theme.card}]}><Text style={styles.miniIcon}>😐</Text><Text style={[styles.miniValue,{color:'#ff9800'}]}>{analysis.statistiche?.numeri_neutral}</Text><Text style={[styles.miniLabel,{color:theme.subtext}]}>Tiepidi</Text></View>
        <View style={[styles.miniStat,{backgroundColor:theme.card}]}><Text style={styles.miniIcon}>⭐</Text><Text style={[styles.miniValue,{color:theme.text}]}>{analysis.statistiche?.punteggio_massimo}</Text><Text style={[styles.miniLabel,{color:theme.subtext}]}>Max</Text></View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.generateBtn} onPress={generateSestine}><Text style={styles.buttonText}>🎲 Genera Sestine</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.favBtn, { backgroundColor: favorites.length >= 6 ? '#ff9800' : '#999' }]} onPress={generateFromFavorites}><Text style={styles.buttonText}>{favorites.length >= 6 ? '⭐ Dai Preferiti' : `⭐ Servono ${6 - favorites.length} numeri`}</Text></TouchableOpacity>
      </View>
      {favorites.length > 0 && (<View style={[styles.favSection,{backgroundColor:theme.card}]}><Text style={[styles.sectionTitle,{color:theme.text}]}>⭐ Preferiti ({favorites.length}/9)</Text><View style={styles.favRow}>{favorites.map((num, i) => (<TouchableOpacity key={i} onPress={() => toggleFavorite(num)}><View style={[styles.favCircle,{backgroundColor:theme.badge}]}><Text style={[styles.favCircleText,{color:theme.text}]}>{num}</Text></View></TouchableOpacity>))}</View></View>)}
      <View style={styles.chartSection}><Text style={[styles.sectionTitle,{color:theme.text}]}>📊 Frequenza Top 9</Text>{analysis.top_9_numeri && analysis.analisi_dettagliata && (<BarChart data={{labels:analysis.top_9_numeri.slice(0,9).map(n=>String(n)),datasets:[{data:analysis.top_9_numeri.slice(0,9).map(n=>{const f=analysis.analisi_dettagliata?.find(a=>a.identificativo===n);return f?.frequenza_recente||0;})}]}} width={Dimensions.get('window').width-30} height={200} chartConfig={{backgroundColor:theme.chartBg,backgroundGradientFrom:theme.chartBg,backgroundGradientTo:theme.chartGradient,decimalCount:0,color:(opacity=1)=>`rgba(76,175,80,${opacity})`,labelColor:(opacity=1)=>`rgba(255,255,255,${opacity})`,barPercentage:0.6}} style={{borderRadius:12,marginHorizontal:15}} />)}</View>
      <View style={styles.combinationsSection}><Text style={[styles.sectionTitle,{color:theme.text}]}>{showFavorites ? '⭐ Sestine dai Preferiti' : '🎲 Migliori Sestine'}</Text>{displayCombos && displayCombos.length > 0 ? (displayCombos.slice(0,10).map((combo,index)=>(<View key={index} style={[styles.comboCard,{backgroundColor:theme.card},index===0&&!showFavorites&&styles.bestCombo]}><Text style={[styles.comboTitle,{color:theme.text}]}>{index===0&&!showFavorites?'🥇 ':index===1&&!showFavorites?'🥈 ':index===2&&!showFavorites?'🥉 ':''}Sestina #{index+1}</Text><View style={styles.comboNumbersRow}>{(combo.numbers || []).map((num, i) => { const isFav = favorites.includes(num); return (<TouchableOpacity key={i} onPress={() => toggleFavorite(num)}><View style={[styles.comboNumberBall, { backgroundColor: isFav ? '#ffd700' : theme.badge }]}><Text style={[styles.comboNumberText, { color: isFav ? '#000' : theme.text }]}>{num}</Text></View></TouchableOpacity>); })}</View><Text style={styles.comboScore}>⭐ {typeof combo.combined_score === 'number' ? combo.combined_score.toFixed(1) : combo.combined_score}</Text></View>))) : (<Text style={[styles.description,{color:theme.subtext}]}>Clicca "🎲 Genera Sestine" per vedere le combinazioni</Text>)}</View>
    </ScrollView>
  );
}

// GENERATOR
function GeneratorScreen({ navigation }) {
  const [generatedNumbers, setGeneratedNumbers] = useState([]);
  const [savedCombos, setSavedCombos] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [userStats, setUserStats] = useState({ totalGenerations: 0, totalSaved: 0 });
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  useEffect(() => { loadSavedCombos(); loadStats(); }, []);
  const loadSavedCombos = async () => { const saved = await AsyncStorage.getItem('generatedCombos'); if (saved) setSavedCombos(JSON.parse(saved)); };
  const loadStats = async () => { const stats = await AsyncStorage.getItem('userStats'); if (stats) setUserStats(JSON.parse(stats)); };
  const generateNumbers = () => { Vibration.vibrate([0,50,50,50,100]); const numbers = []; while (numbers.length < 6) { const num = Math.floor(Math.random() * 90) + 1; if (!numbers.includes(num)) numbers.push(num); } numbers.sort((a, b) => a - b); setGeneratedNumbers(numbers); const newStats = { ...userStats, totalGenerations: userStats.totalGenerations + 1 }; setUserStats(newStats); AsyncStorage.setItem('userStats', JSON.stringify(newStats)); };
  const saveCombo = async () => { if (generatedNumbers.length === 0) { Alert.alert('⚠️', 'Genera prima una combinazione'); return; } Vibration.vibrate([0,50,50,50,100]); const newCombo = { id: Date.now(), numbers: [...generatedNumbers], date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }; const updated = [newCombo, ...savedCombos].slice(0, 50); setSavedCombos(updated); await AsyncStorage.setItem('generatedCombos', JSON.stringify(updated)); const newStats = { ...userStats, totalSaved: userStats.totalSaved + 1 }; setUserStats(newStats); AsyncStorage.setItem('userStats', JSON.stringify(newStats)); Alert.alert('✅', 'Combinazione salvata!'); };
  const deleteCombo = async (id) => { const updated = savedCombos.filter(c => c.id !== id); setSavedCombos(updated); await AsyncStorage.setItem('generatedCombos', JSON.stringify(updated)); };
  const clearArchive = async () => { Alert.alert('🗑️', 'Cancellare tutto l\'archivio?', [{ text: 'Annulla', style: 'cancel' }, { text: 'Cancella', style: 'destructive', onPress: async () => { setSavedCombos([]); await AsyncStorage.setItem('generatedCombos', JSON.stringify([])); } }]); };
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.dashboardCard, { backgroundColor: theme.card }]}><Text style={[styles.sectionTitle, { color: theme.text }]}>👤 Dashboard</Text><View style={styles.dashboardRow}><View style={styles.dashboardItem}><Text style={styles.dashboardValue}>{userStats.totalGenerations}</Text><Text style={[styles.dashboardLabel, { color: theme.subtext }]}>Generazioni</Text></View><View style={styles.dashboardItem}><Text style={styles.dashboardValue}>{userStats.totalSaved}</Text><Text style={[styles.dashboardLabel, { color: theme.subtext }]}>Salvati</Text></View><View style={styles.dashboardItem}><Text style={styles.dashboardValue}>{savedCombos.length}</Text><Text style={[styles.dashboardLabel, { color: theme.subtext }]}>In archivio</Text></View></View></View>
      <View style={[styles.generatorCard, { backgroundColor: theme.card }]}><Text style={[styles.sectionTitle, { color: theme.text }]}>🎲 Genera Numeri</Text>
        {generatedNumbers.length > 0 ? (<View style={styles.generatedNumbersRow}>{generatedNumbers.map((num, i) => (<View key={i} style={styles.generatedBall}><Text style={styles.generatedBallText}>{num}</Text></View>))}</View>) : (<Text style={[styles.description, { color: theme.subtext }]}>Clicca "Genera" per creare una combinazione casuale</Text>)}
        <View style={styles.actionButtons}><TouchableOpacity style={styles.generateBtn2} onPress={generateNumbers}><Text style={styles.buttonText}>🎲 Genera</Text></TouchableOpacity><TouchableOpacity style={[styles.saveBtn, { opacity: generatedNumbers.length > 0 ? 1 : 0.5 }]} onPress={saveCombo}><Text style={styles.buttonText}>💾 Salva</Text></TouchableOpacity></View>
      </View>
      <TouchableOpacity style={[styles.archiveBtn, { backgroundColor: theme.card }]} onPress={() => setShowArchive(!showArchive)}><Text style={[styles.sectionTitle, { color: theme.text }]}>{showArchive ? '📋 Nascondi Archivio' : '📋 Visualizza Archivio'} ({savedCombos.length})</Text></TouchableOpacity>
      {showArchive && (<View style={[styles.archiveCard, { backgroundColor: theme.card }]}>{savedCombos.length > 0 ? (<><TouchableOpacity style={styles.clearBtn} onPress={clearArchive}><Text style={styles.clearBtnText}>🗑️ Cancella tutto</Text></TouchableOpacity>{savedCombos.map((combo, i) => (<View key={i} style={styles.archiveItem}><View style={styles.archiveHeader}><Text style={[styles.archiveDate, { color: theme.text }]}>📅 {combo.date} {combo.time}</Text><TouchableOpacity onPress={() => deleteCombo(combo.id)}><Text style={styles.deleteIcon}>🗑️</Text></TouchableOpacity></View><View style={styles.archiveNumbersRow}>{combo.numbers.map((num, j) => (<View key={j} style={[styles.archiveBall, { backgroundColor: theme.badge }]}><Text style={[styles.archiveBallText, { color: theme.text }]}>{num}</Text></View>))}</View></View>))}</>) : (<Text style={[styles.description, { color: theme.subtext }]}>Nessuna combinazione salvata</Text>)}</View>)}
    </ScrollView>
  );
}

// EXTRACTION LIST
function ExtractionListScreen() {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  useEffect(() => { fetchExtractions(); }, []);
  const fetchExtractions = async () => { try { const r = await axios.get(`${API_BASE_URL}/api/extractions?limit=50`); setExtractions(r.data); } catch (e) {} finally { setLoading(false); } };
  if (loading) return <View style={[styles.container,{backgroundColor:theme.bg}]}><ActivityIndicator size="large" color="#1a237e" style={{marginTop:100}} /></View>;
  return (<ScrollView style={[styles.container,{backgroundColor:theme.bg}]}><View style={[styles.listHeader,{backgroundColor:theme.card}]}><Text style={[styles.sectionTitle,{color:theme.text}]}>📋 Archivio</Text></View>{extractions.map((ext,i)=>(<View key={i} style={[styles.extractionCard,{backgroundColor:theme.card}]}><Text style={[styles.extractionDate,{color:theme.text}]}>📅 {ext.extraction_date}</Text><Text style={[styles.extractionNumbers,{color:theme.inputText}]}>🎱 {ext.n1} - {ext.n2} - {ext.n3} - {ext.n4} - {ext.n5} - {ext.n6}</Text></View>))}</ScrollView>);
}

// ADD EXTRACTION
function AddExtractionScreen({ navigation }) {
  const [date, setDate] = useState('');
  const [numbers, setNumbers] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const handleSubmit = async () => { if (!date || numbers.some(n => !n || n < 1 || n > 90)) { Vibration.vibrate(200); Alert.alert('Errore'); return; } setLoading(true); try { await axios.post(`${API_BASE_URL}/api/extractions`, { date, numbers: numbers.map(Number) }); Vibration.vibrate([0,50,50,50,100]); Alert.alert('OK', 'Aggiunta!'); navigation.goBack(); } catch (e) { Vibration.vibrate(500); Alert.alert('Errore'); } finally { setLoading(false); } };
  return (<ScrollView style={[styles.container,{backgroundColor:theme.bg}]}><View style={[styles.formHeader,{backgroundColor:theme.card}]}><Text style={styles.formIcon}>➕</Text><Text style={[styles.sectionTitle,{color:theme.text}]}>Nuova Estrazione</Text></View><View style={[styles.formGroup,{backgroundColor:theme.card}]}><Text style={[styles.label,{color:theme.text}]}>📅 Data</Text><TextInput style={[styles.input,{backgroundColor:theme.input,color:theme.inputText,borderColor:theme.border}]} value={date} onChangeText={setDate} placeholder="2026-08-01" placeholderTextColor="#999" /></View><View style={[styles.formGroup,{backgroundColor:theme.card}]}><Text style={[styles.label,{color:theme.text}]}>🎱 6 Numeri</Text><View style={styles.numbersInputRow}>{numbers.map((n,i)=>(<TextInput key={i} style={[styles.numberInput,{backgroundColor:theme.input,color:theme.inputText,borderColor:theme.border}]} value={n} onChangeText={t=>{let m=[...numbers];m[i]=t;setNumbers(m);}} keyboardType="numeric" maxLength={2} placeholder={String(i+1)} placeholderTextColor="#999" />))}</View></View><TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}><Text style={styles.buttonText}>{loading?'⏳ Salvataggio...':'💾 SALVA'}</Text></TouchableOpacity></ScrollView>);
}

// SUBSCRIPTION CON BILLING
function SubscriptionScreen() {
  const [purchasing, setPurchasing] = useState(false);
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    InAppPurchases.connectAsync();
    return () => InAppPurchases.disconnectAsync();
  }, []);

  const handlePurchase = async (productId) => {
    setPurchasing(true);
    try {
      const { responseCode } = await InAppPurchases.purchaseItemAsync(productId);
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        Vibration.vibrate([0,50,50,50,100]);
        Alert.alert('✅', 'Abbonamento attivato con successo!');
      }
    } catch (e) {
      Alert.alert('Errore', 'Acquisto fallito. Riprova.');
    } finally {
      setPurchasing(false);
    }
  };

  const plans = [
    { id: 'superenalotto_weekly', name: '📅 Settimanale', price: '2.99', days: 7, color: '#4caf50' },
    { id: 'superenalotto_monthly', name: '📅 Mensile', price: '9.99', days: 30, color: '#2196f3' },
    { id: 'superenalotto_annual', name: '📅 Annuale', price: '79.99', days: 365, color: '#9c27b0' },
  ];

  return (
    <ScrollView style={[styles.container,{backgroundColor:theme.bg}]}>
      <View style={[styles.subscriptionHeader,{backgroundColor:theme.header}]}>
        <Text style={styles.subscriptionIcon}>💎</Text>
        <Text style={styles.title}>Piani Abbonamento</Text>
        <Text style={styles.subtitle}>✅ 3 giorni di prova gratuita</Text>
      </View>
      {plans.map((plan) => (
        <TouchableOpacity key={plan.id} style={[styles.planCard,{borderLeftColor:plan.color,backgroundColor:theme.card}]} onPress={() => handlePurchase(plan.id)} disabled={purchasing}>
          <View style={styles.planInfo}>
            <Text style={[styles.planName,{color:theme.text}]}>{plan.name}</Text>
            <Text style={[styles.planDuration,{color:theme.subtext}]}>⏱️ {plan.days} giorni</Text>
          </View>
          <Text style={[styles.planPrice,{color:plan.color}]}>€{plan.price}</Text>
        </TouchableOpacity>
      ))}
      <View style={[styles.trialInfo,{backgroundColor:theme.badge}]}>
        <Text style={styles.trialText}>🆓 3 giorni di prova gratuita</Text>
        <Text style={styles.trialSubtext}>Nessun impegno, disdici quando vuoi</Text>
      </View>
    </ScrollView>
  );
}

// MAIN APP
export default function App() {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');
  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: isDark ? '#000' : '#1a237e' }, headerTintColor: '#fff' }}>
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: '📝 Registrazione' }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '🏠 Home', headerLeft: () => null }} />
          <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: '🔮 Analisi' }} />
          <Stack.Screen name="Results" component={ResultsScreen} options={{ title: '🏆 Risultati' }} />
          <Stack.Screen name="Generator" component={GeneratorScreen} options={{ title: '🎲 Generatore' }} />
          <Stack.Screen name="ExtractionList" component={ExtractionListScreen} options={{ title: '📋 Archivio' }} />
          <Stack.Screen name="AddExtraction" component={AddExtractionScreen} options={{ title: '➕ Nuova' }} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: '💎 Abbonamento' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}

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
  statsBadge: { padding: 15, marginHorizontal: 15, marginTop: -10, borderRadius: 10, alignItems: 'center' },
  statsBadgeIcon: { fontSize: 25 },
  statsBadgeText: { fontSize: 18, fontWeight: 'bold' },
  calendarCard: { margin: 15, padding: 15, borderRadius: 12, elevation: 2 },
  calendarTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  calendarSubtitle: { fontSize: 12, marginBottom: 10 },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calendarDay: { alignItems: 'center', flex: 1 },
  calendarDayName: { fontSize: 10, fontWeight: '500', marginBottom: 4 },
  calendarDayNumber: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  calendarToday: { backgroundColor: '#1a237e', borderWidth: 2, borderColor: '#1a237e' },
  calendarExtraction: { backgroundColor: '#f44336' },
  calendarDayText: { fontSize: 13 },
  extractionDot: { fontSize: 8, marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  analysisIcon: { fontSize: 60, textAlign: 'center', marginBottom: 10 },
  periodSection: { padding: 15 },
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  periodButton: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  periodButtonText: { fontSize: 13, fontWeight: '500' },
  bigAnalyzeButton: { backgroundColor: '#4caf50', margin: 20, padding: 30, borderRadius: 20, alignItems: 'center' },
  bigButtonIcon: { fontSize: 50, marginBottom: 10 },
  bigButtonText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  resultIcon: { fontSize: 50, marginBottom: 10 },
  topBadge: { borderWidth: 2, borderColor: '#ffd700' },
  bestCombo: { borderWidth: 2, borderColor: '#ffd700' },
  chartSection: { padding: 15, marginBottom: 15 },
  listHeader: { padding: 20, margin: 15, borderRadius: 12, alignItems: 'center' },
  extractionCard: { marginHorizontal: 15, marginBottom: 8, padding: 15, borderRadius: 10, elevation: 2 },
  extractionDate: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  extractionNumbers: { fontSize: 18, fontWeight: '500' },
  formIcon: { fontSize: 50, textAlign: 'center', marginBottom: 10 },
  subscriptionIcon: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  titleSmall: { fontSize: 22, fontWeight: '300', color: '#fff' },
  subtitle: { fontSize: 14, color: '#b3b3b3', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#f44336', marginHorizontal: 15, marginTop: 15, padding: 15, borderRadius: 12, alignItems: 'center' },
  analysisHeader: { padding: 20, margin: 15, borderRadius: 12, alignItems: 'center' },
  loadingContainer: { alignItems: 'center', padding: 60 },
  loadingText: { fontSize: 18, marginTop: 20, fontWeight: 'bold' },
  resultHeader: { padding: 25, alignItems: 'center' },
  resultTitle: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 20 },
  combinationsSection: { padding: 15 },
  termsCard: { margin: 15, padding: 20, borderRadius: 12 },
  termsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  termsSubtitle: { fontSize: 15, fontWeight: 'bold', marginTop: 12, marginBottom: 5 },
  termsText: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  ageCard: { margin: 15, padding: 20, borderRadius: 12 },
  ageRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  ageButton: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  ageButtonText: { fontSize: 16, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', margin: 15, gap: 10, marginBottom: 30 },
  refuseButton: { flex: 1, backgroundColor: '#f44336', padding: 18, borderRadius: 12, alignItems: 'center' },
  acceptButton: { flex: 1, backgroundColor: '#4caf50', padding: 18, borderRadius: 12, alignItems: 'center' },
  circleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 15 },
  circleNumber: { justifyContent: 'center', alignItems: 'center', elevation: 3 },
  circleText: { fontWeight: 'bold' },
  medalCircle: { fontSize: 14, position: 'absolute', top: -8, right: -5 },
  favStar: { fontSize: 12, position: 'absolute', bottom: -5 },
  statsRow: { flexDirection: 'row', padding: 10, gap: 5 },
  miniStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  miniIcon: { fontSize: 20 },
  miniValue: { fontSize: 18, fontWeight: 'bold' },
  miniLabel: { fontSize: 10 },
  actionButtons: { flexDirection: 'row', padding: 10, gap: 10 },
  generateBtn: { flex: 1, backgroundColor: '#4caf50', padding: 15, borderRadius: 12, alignItems: 'center' },
  favBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  favSection: { margin: 10, padding: 15, borderRadius: 12 },
  favRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  favCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  favCircleText: { fontWeight: 'bold', fontSize: 14 },
  comboNumbersRow: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 5 },
  comboNumberBall: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  comboNumberText: { fontWeight: 'bold', fontSize: 13 },
  comboScore: { fontSize: 14, color: '#4caf50', marginTop: 5, fontWeight: 'bold' },
  comboCard: { padding: 18, marginVertical: 6, borderRadius: 12, elevation: 2 },
  comboTitle: { fontSize: 16, fontWeight: 'bold' },
  formHeader: { padding: 20, margin: 15, borderRadius: 12, alignItems: 'center' },
  formGroup: { padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 12 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  numbersInputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  numberInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 18, width: 48, textAlign: 'center' },
  submitButton: { backgroundColor: '#ff9800', margin: 15, padding: 18, borderRadius: 12, alignItems: 'center' },
  subscriptionHeader: { padding: 30, alignItems: 'center' },
  planCard: { marginHorizontal: 15, marginTop: 15, padding: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5 },
  planInfo: { flex: 1 },
  planName: { fontSize: 20, fontWeight: 'bold' },
  planDuration: { fontSize: 14, marginTop: 5 },
  planPrice: { fontSize: 28, fontWeight: 'bold' },
  dashboardCard: { margin: 15, padding: 15, borderRadius: 12 },
  dashboardRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  dashboardItem: { alignItems: 'center' },
  dashboardValue: { fontSize: 28, fontWeight: 'bold', color: '#1a237e' },
  dashboardLabel: { fontSize: 11, marginTop: 3 },
  generatorCard: { margin: 15, padding: 15, borderRadius: 12 },
  generatedNumbersRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 15 },
  generatedBall: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#1a237e', justifyContent: 'center', alignItems: 'center' },
  generatedBallText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  generateBtn2: { flex: 1, backgroundColor: '#1a237e', padding: 15, borderRadius: 12, alignItems: 'center', marginRight: 5 },
  saveBtn: { flex: 1, backgroundColor: '#ff9800', padding: 15, borderRadius: 12, alignItems: 'center', marginLeft: 5 },
  archiveBtn: { margin: 15, padding: 15, borderRadius: 12 },
  archiveCard: { marginHorizontal: 15, marginBottom: 30, padding: 15, borderRadius: 12 },
  clearBtn: { alignItems: 'flex-end', marginBottom: 10 },
  clearBtnText: { color: '#f44336', fontSize: 14 },
  archiveItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  archiveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  archiveDate: { fontSize: 13 },
  deleteIcon: { fontSize: 16 },
  archiveNumbersRow: { flexDirection: 'row', gap: 6 },
  archiveBall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  archiveBallText: { fontSize: 13, fontWeight: 'bold' },
  description: { fontSize: 14, textAlign: 'center', marginTop: 10 },
  features: { padding: 20, margin: 15, borderRadius: 15 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  featureBadgeText: { fontSize: 12, fontWeight: '500' },
  statsBadgeSubtext: { fontSize: 12, color: '#666', marginTop: 3 },
  footer: { textAlign: 'center', marginTop: 20, marginBottom: 30 },
  loadingSubtext: { fontSize: 13, color: '#666', marginTop: 8 },
  bigButtonSubText: { color: '#e0e0e0', fontSize: 12, marginTop: 5 },
  trialInfo: { margin: 30, alignItems: 'center', padding: 20, borderRadius: 12 },
  trialText: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  trialSubtext: { fontSize: 14, color: '#666', marginTop: 5 },
  ageSubtext: { fontSize: 12, marginTop: 5 },
  extractionExtra: { fontSize: 12, color: '#666', marginTop: 3 },
  numbersGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  numberBadge: { backgroundColor: '#fff', borderRadius: 15, padding: 12, alignItems: 'center', width: 65, elevation: 3 },
  rankText: { fontSize: 10, color: '#666', fontWeight: 'bold' },
  numberText: { fontSize: 24, fontWeight: 'bold', color: '#1a237e' },
  comboNumbers: { fontSize: 18, marginTop: 8, fontWeight: '500' },
  medalIcon: { fontSize: 16, position: 'absolute', top: -10, right: -5 },
  comboHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', gap: 10 },
  statCard: { padding: 20, borderRadius: 12, alignItems: 'center', flex: 1, elevation: 2 },
  statIcon: { fontSize: 25, marginBottom: 5 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  statsSection: { padding: 15 },
  resultHeaderOld: { padding: 25, alignItems: 'center' },
});