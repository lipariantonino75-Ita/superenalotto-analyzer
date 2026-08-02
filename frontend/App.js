// ============ RESULTS SCREEN RINNOVATA ============
function ResultsScreen({ route, navigation }) {
  const { analysis, period } = route.params || {};
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [generatedCombos, setGeneratedCombos] = useState(null);

  useEffect(() => { 
    Vibration.vibrate([0,100,50,100,50,100,200]); 
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const favs = await AsyncStorage.getItem('favorites');
    if (favs) setFavorites(JSON.parse(favs));
  };

  const toggleFavorite = async (num) => {
    let newFavs;
    if (favorites.includes(num)) {
      newFavs = favorites.filter(f => f !== num);
    } else {
      newFavs = [...favorites, num].slice(0, 9); // max 9 preferiti
    }
    setFavorites(newFavs);
    await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
    Vibration.vibrate(50);
  };

  const generateSestine = () => {
    Vibration.vibrate([0,50,50,50,100]);
    if (analysis?.migliori_sestine) {
      setGeneratedCombos(analysis.migliori_sestine.slice(0, 10));
      setShowFavorites(false);
    }
  };

  const generateFromFavorites = () => {
    if (favorites.length >= 6) {
      Vibration.vibrate([0,50,50,50,100]);
      const combos = [];
      for (let i = 0; i < 10; i++) {
        const shuffled = [...favorites].sort(() => Math.random() - 0.5).slice(0, 6);
        combos.push({ numbers: shuffled.sort((a,b)=>a-b), combined_score: '★'.repeat(Math.floor(Math.random()*5)+1) });
      }
      setGeneratedCombos(combos);
      setShowFavorites(true);
    } else {
      Alert.alert('⚠️', 'Salva almeno 6 numeri preferiti per generare sestine');
    }
  };

  if (!analysis) return <View style={[styles.container,{backgroundColor:theme.bg}]}><Text style={{color:theme.text}}>Nessun risultato</Text></View>;
  
  const periodLabel = period==='1m'?'(Ultimo mese)':period==='6m'?'(Ultimi 6 mesi)':period==='1y'?'(Ultimo anno)':'(Dal 1997)';
  const displayCombos = generatedCombos || analysis.migliori_sestine?.slice(0, 10);

  return (
    <ScrollView style={[styles.container,{backgroundColor:theme.bg}]}>
      
      {/* HEADER RISULTATI */}
      <View style={[styles.resultHeader,{backgroundColor:theme.header}]}>
        <Text style={styles.resultIcon}>🏆</Text>
        <Text style={styles.resultTitle}>Top 9 Numeri {periodLabel}</Text>
        
        {/* NUMERI IN FORMA CIRCOLARE */}
        <View style={styles.circleGrid}>
          {analysis.top_9_numeri?.map((num, index) => {
            const detail = analysis.analisi_dettagliata?.find(a => a.identificativo === num);
            const isFav = favorites.includes(num);
            const size = index < 3 ? 70 : 55;
            const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#1a237e', '#1a237e', '#1a237e', '#1a237e', '#1a237e', '#1a237e'];
            return (
              <TouchableOpacity key={index} onPress={() => toggleFavorite(num)}>
                <View style={[styles.circleNumber, { 
                  width: size, height: size, borderRadius: size/2,
                  backgroundColor: index < 3 ? colors[index] : theme.card,
                  borderColor: index < 3 ? colors[index] : theme.border,
                  borderWidth: 2
                }]}>
                  <Text style={[styles.circleText, { color: index < 3 ? '#000' : theme.text, fontSize: index < 3 ? 20 : 16 }]}>{num}</Text>
                  {index < 3 && <Text style={styles.medalCircle}>{index===0?'🥇':index===1?'🥈':'🥉'}</Text>}
                  {isFav && <Text style={styles.favStar}>⭐</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* STATS COMPATTE CON ICONE */}
      <View style={styles.statsRow}>
        <View style={[styles.miniStat,{backgroundColor:theme.card}]}>
          <Text style={styles.miniIcon}>🔥</Text>
          <Text style={[styles.miniValue,{color:'#f44336'}]}>{analysis.statistiche?.numeri_hot}</Text>
          <Text style={[styles.miniLabel,{color:theme.subtext}]}>Hot</Text>
        </View>
        <View style={[styles.miniStat,{backgroundColor:theme.card}]}>
          <Text style={styles.miniIcon}>❄️</Text>
          <Text style={[styles.miniValue,{color:'#2196f3'}]}>{analysis.statistiche?.numeri_cold}</Text>
          <Text style={[styles.miniLabel,{color:theme.subtext}]}>Cold</Text>
        </View>
        <View style={[styles.miniStat,{backgroundColor:theme.card}]}>
          <Text style={styles.miniIcon}>😐</Text>
          <Text style={[styles.miniValue,{color:'#ff9800'}]}>{analysis.statistiche?.numeri_neutral}</Text>
          <Text style={[styles.miniLabel,{color:theme.subtext}]}>Tiepidi</Text>
        </View>
        <View style={[styles.miniStat,{backgroundColor:theme.card}]}>
          <Text style={styles.miniIcon}>⭐</Text>
          <Text style={[styles.miniValue,{color:theme.text}]}>{analysis.statistiche?.punteggio_massimo}</Text>
          <Text style={[styles.miniLabel,{color:theme.subtext}]}>Max</Text>
        </View>
      </View>

      {/* PULSANTI AZIONE */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.generateBtn} onPress={generateSestine}>
          <Text style={styles.buttonText}>🎲 Genera Sestine</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.favBtn, {backgroundColor: favorites.length >= 6 ? '#ff9800' : '#999'}]} onPress={generateFromFavorites}>
          <Text style={styles.buttonText}>⭐ Dai Preferiti</Text>
        </TouchableOpacity>
      </View>

      {/* NUMERI PREFERITI */}
      {favorites.length > 0 && (
        <View style={[styles.favSection,{backgroundColor:theme.card}]}>
          <Text style={[styles.sectionTitle,{color:theme.text}]}>⭐ I tuoi preferiti ({favorites.length}/9)</Text>
          <View style={styles.favRow}>
            {favorites.map((num, i) => (
              <TouchableOpacity key={i} onPress={() => toggleFavorite(num)}>
                <View style={[styles.favCircle,{backgroundColor:theme.badge}]}>
                  <Text style={[styles.favCircleText,{color:theme.text}]}>{num}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* GRAFICO INTERATTIVO */}
      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle,{color:theme.text}]}>📊 Frequenza Top 9</Text>
        {analysis.top_9_numeri && analysis.analisi_dettagliata && (
          <BarChart
            data={{
              labels: analysis.top_9_numeri.slice(0,9).map(n=>String(n)),
              datasets:[{data: analysis.top_9_numeri.slice(0,9).map(n=>{
                const f=analysis.analisi_dettagliata?.find(a=>a.identificativo===n);
                return f?.frequenza_recente||0;
              })}]
            }}
            width={Dimensions.get('window').width-30}
            height={200}
            chartConfig={{
              backgroundColor:theme.chartBg,
              backgroundGradientFrom:theme.chartBg,
              backgroundGradientTo:theme.chartGradient,
              decimalCount:0,
              color:(opacity=1)=>`rgba(76,175,80,${opacity})`,
              labelColor:(opacity=1)=>`rgba(255,255,255,${opacity})`,
              barPercentage:0.6,
            }}
            style={{borderRadius:12,marginHorizontal:15,marginBottom:15}}
          />
        )}
      </View>

      {/* SESTINE */}
      <View style={styles.combinationsSection}>
        <Text style={[styles.sectionTitle,{color:theme.text}]}>
          {showFavorites ? '⭐ Sestine dai Preferiti' : '🎲 Migliori Sestine'}
        </Text>
        {displayCombos?.slice(0,10).map((combo,index)=>(
          <View key={index} style={[styles.comboCard,{backgroundColor:theme.card},index===0&&!showFavorites&&styles.bestCombo]}>
            <View style={styles.comboHeader}>
              <Text style={[styles.comboTitle,{color:theme.text}]}>{index===0&&!showFavorites?'🥇 ':index===1&&!showFavorites?'🥈 ':index===2&&!showFavorites?'🥉 ':''}Sestina #{index+1}</Text>
            </View>
            <View style={styles.comboNumbersRow}>
              {(combo.numbers || combo.numbers)?.map((num, i) => {
                const isFav = favorites.includes(num);
                return (
                  <TouchableOpacity key={i} onPress={() => toggleFavorite(num)}>
                    <View style={[styles.comboNumberBall, {backgroundColor: isFav ? '#ffd700' : theme.badge}]}>
                      <Text style={[styles.comboNumberText, {color: isFav ? '#000' : theme.text}]}>{num}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.comboScore}>⭐ {combo.combined_score || combo.combined_score}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}