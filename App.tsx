import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from '@expo-google-fonts/figtree';
import { colors } from './src/theme';
import { T } from './src/ui/kit';
import { Icon, type IconName } from './src/ui/Icon';
import { useRingData } from './src/data/useRingData';
import { useUpdate } from './src/update/useUpdate';
import { Today } from './src/screens/Today';
import { Vitals } from './src/screens/Vitals';
import { ActivitySettings, AddSheet, Devices, Drawer, MyHealth, Profile, Settings, WomensHealthSettings } from './src/screens/Menus';
import { ScoreDetail, SleepHealth, type DetailKind } from './src/screens/Details';
import { CycleHistory, CycleInsights } from './src/screens/Cycle';

type Tab = 'today' | 'vitals' | 'health';
type Sub = 'profile' | 'devices' | 'settings' | 'setActivity' | 'setWomen' | DetailKind | 'sleepHealth' | 'cycle' | 'cycleHistory';
const details: string[] = ['ready', 'sleep', 'act', 'heart', 'stress'];

export default function App() {
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold });
  const { snap, status, tags, reload, connect, logPeriod, addTag, setStepGoal, setPref } = useRingData();
  const update = useUpdate();
  const [tab, setTab] = useState<Tab>('today');
  // Screens opened on top of the tabs; back pops one.
  const [stack, setStack] = useState<Sub[]>([]);
  const sub = stack[stack.length - 1];
  const push = (s: Sub) => setStack((st) => [...st, s]);
  const pop = () => setStack((st) => st.slice(0, -1));
  const replace = (s: Sub) => setStack((st) => [...st.slice(0, -1), s]);
  const [focus, setFocus] = useState<string | undefined>();
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  const toast = useCallback(
    (m: string) => {
      setMsg(m);
      fade.setValue(1);
      Animated.timing(fade, { toValue: 0, duration: 400, delay: 1800, useNativeDriver: true }).start(() => setMsg(null));
    },
    [fade],
  );

  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sub) return pop(), true;
      if (tab !== 'today') return setTab('today'), true;
      return false;
    });
    return () => h.remove();
  }, [sub, tab]);

  const go = (target: string) => {
    setDrawer(false);
    if (target === 'add') return setSheet(true);
    if (target.startsWith('vitals:')) {
      setStack([]);
      setTab('vitals');
      setFocus(target.split(':')[1] + ':' + Date.now());
      return;
    }
    if (target === 'health') return setStack([]), setTab('health');
    push(target as Sub);
  };

  if (!fontsLoaded || !snap) {
    return (
      <View style={[st.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  let body: React.ReactNode;
  const periodLogged = () => logPeriod().then(() => toast('Period logged'));
  if (sub === 'profile') body = <Profile onBack={pop} />;
  else if (sub === 'devices') body = <Devices onBack={pop} snap={snap} />;
  else if (sub === 'settings') body = <Settings onBack={pop} status={status} source={snap.source} onConnect={connect} onReload={reload} onOpen={push} />;
  else if (sub === 'setActivity') body = <ActivitySettings onBack={pop} maxHr={snap.maxHr} onMaxHr={(v) => setPref('maxHr', v)} />;
  else if (sub === 'setWomen') body = <WomensHealthSettings onBack={pop} predictions={snap.predictions} onPredictions={(v) => setPref('predictions', v)} />;
  else if (sub && details.includes(sub))
    body = (
      <ScoreDetail
        kind={sub as DetailKind}
        snap={snap}
        tags={tags}
        onBack={pop}
        onSwitch={replace}
        onOpen={push}
        onAdd={() => setSheet(true)}
        onStepGoal={(g) => setStepGoal(g).then(() => toast('Goal saved'))}
      />
    );
  else if (sub === 'sleepHealth') body = <SleepHealth snap={snap} onBack={pop} />;
  else if (sub === 'cycle') body = <CycleInsights snap={snap} onBack={pop} onHistory={() => push('cycleHistory')} onLogPeriod={periodLogged} onAdd={() => setSheet(true)} />;
  else if (sub === 'cycleHistory') body = <CycleHistory snap={snap} onBack={pop} />;
  else if (tab === 'vitals') body = <Vitals snap={snap} focus={focus?.split(':')[0]} key={focus} onOpen={(k) => push(k as Sub)} />;
  else if (tab === 'health') body = <MyHealth snap={snap} />;
  else
    body = (
      <Today
        snap={snap}
        tags={tags}
        onMenu={() => setDrawer(true)}
        onDevices={() => push('devices')}
        onVitals={(sec) => go(`vitals:${sec}`)}
        onOpen={(k) => push(k as Sub)}
        onAdd={() => setSheet(true)}
        onLogPeriod={periodLogged}
        toast={toast}
      />
    );

  const navItems: [Tab, IconName, string][] = [
    ['today', 'sun', 'Today'],
    ['vitals', 'leaf', 'Vitals'],
    ['health', 'tree', 'My Health'],
  ];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={st.root} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        {body}
        {!sub && (
          <View style={st.navWrap} pointerEvents="box-none">
            <View style={st.nav}>
              {navItems.map(([key, icon, label]) => {
                const on = tab === key;
                return (
                  <Pressable key={key} onPress={() => (setTab(key), setFocus(undefined))} style={st.navBtn}>
                    <Icon name={icon} color={on ? colors.ink : colors.ink2} fill={on && icon === 'leaf' ? colors.ink : undefined} />
                    <T size={13} color={on ? colors.ink : colors.ink2}>
                      {label}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setSheet(true)} style={st.fab} accessibilityLabel="Add">
              <Icon name="plusSpark" size={34} />
            </Pressable>
          </View>
        )}
        {msg ? (
          <Animated.View style={[st.toast, { opacity: fade }]} pointerEvents="none">
            <T weight="medium" color="#1b1b1d">
              {msg}
            </T>
          </Animated.View>
        ) : null}
        <Drawer open={drawer} onClose={() => setDrawer(false)} go={go} toast={toast} />
        <AddSheet
          open={sheet}
          onClose={() => setSheet(false)}
          onLogPeriod={() => logPeriod().then(() => toast('Period logged'))}
          onAdd={(t) => addTag(t).then(() => toast('Added to your timeline'))}
        />
        <Modal visible={!!update.available || update.live} transparent animationType="fade" onRequestClose={update.dismiss}>
          <View style={st.updWrap}>
            <View style={st.upd}>
              <T serif size={34} style={{ textAlign: 'center' }}>
                Update
              </T>
              {update.live ? (
                <T size={15} color={colors.ink2} style={{ textAlign: 'center' }}>
                  A new version is ready. Halo will restart in a second.
                </T>
              ) : null}
              <Pressable onPress={update.live ? update.restart : update.install} disabled={update.busy} style={st.updBtn} accessibilityLabel="Update">
                {update.busy ? (
                  <ActivityIndicator color="#1b1b1d" />
                ) : (
                  <T weight="bold" size={18} color="#1b1b1d">
                    Update
                  </T>
                )}
              </Pressable>
              <Pressable onPress={update.dismiss} hitSlop={10}>
                <T size={15} color={colors.ink2}>
                  Later
                </T>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  nav: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#2a2a2ef2', borderRadius: 999, paddingVertical: 10, borderWidth: 1, borderColor: '#ffffff12' },
  navBtn: { alignItems: 'center', gap: 4, minWidth: 72, paddingVertical: 4 },
  fab: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#34343a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff14', elevation: 8 },
  updWrap: { flex: 1, backgroundColor: '#000b', alignItems: 'center', justifyContent: 'center', padding: 32 },
  upd: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: 28, padding: 28, alignItems: 'center', gap: 18 },
  updBtn: { alignSelf: 'stretch', minHeight: 54, borderRadius: 999, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 120, backgroundColor: colors.cream, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
});
