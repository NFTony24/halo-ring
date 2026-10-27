import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from '@expo-google-fonts/figtree';
import { colors } from './src/theme';
import { T } from './src/ui/kit';
import { Icon, type IconName } from './src/ui/Icon';
import { useRingData } from './src/data/useRingData';
import { Today } from './src/screens/Today';
import { Vitals } from './src/screens/Vitals';
import { AddSheet, Devices, Drawer, MyHealth, Profile, Settings } from './src/screens/Menus';

type Tab = 'today' | 'vitals' | 'health';
type Sub = 'profile' | 'devices' | 'settings' | null;

export default function App() {
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold });
  const { snap, status, tags, reload, connect, logPeriod, addTag } = useRingData();
  const [tab, setTab] = useState<Tab>('today');
  const [sub, setSub] = useState<Sub>(null);
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
      if (sub) return setSub(null), true;
      if (tab !== 'today') return setTab('today'), true;
      return false;
    });
    return () => h.remove();
  }, [sub, tab]);

  const go = (target: string) => {
    setDrawer(false);
    if (target === 'add') return setSheet(true);
    if (target.startsWith('vitals:')) {
      setSub(null);
      setTab('vitals');
      setFocus(target.split(':')[1] + ':' + Date.now());
      return;
    }
    if (target === 'health') return setSub(null), setTab('health');
    setSub(target as Sub);
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
  if (sub === 'profile') body = <Profile onBack={() => setSub(null)} />;
  else if (sub === 'devices') body = <Devices onBack={() => setSub(null)} snap={snap} />;
  else if (sub === 'settings') body = <Settings onBack={() => setSub(null)} status={status} source={snap.source} onConnect={connect} onReload={reload} />;
  else if (tab === 'vitals') body = <Vitals snap={snap} focus={focus?.split(':')[0]} key={focus} />;
  else if (tab === 'health') body = <MyHealth snap={snap} />;
  else
    body = (
      <Today
        snap={snap}
        tags={tags}
        onMenu={() => setDrawer(true)}
        onDevices={() => setSub('devices')}
        onVitals={(sec) => go(`vitals:${sec}`)}
        onAdd={() => setSheet(true)}
        onLogPeriod={() => logPeriod().then(() => toast('Period logged'))}
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
  toast: { position: 'absolute', alignSelf: 'center', bottom: 120, backgroundColor: colors.cream, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
});
