import { Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useState } from 'react';
import { colors } from '../theme';
import { Card, GroupLabel, ListGroup, ListRow, T, Glow } from '../ui/kit';
import { Icon, type IconName } from '../ui/Icon';
import { Spark } from '../ui/charts';
import { hm } from '../data/dates';
import type { Snapshot } from '../data/types';
import type { HcStatus } from '../data/healthConnect';
import { openHealthConnectSettings } from '../data/healthConnect';
import type { Tag } from '../data/useRingData';

const OURA_STORE = 'market://details?id=com.ouraring.oura';

export function SubBar({ title, onBack, close }: { title?: string; onBack: () => void; close?: boolean }) {
  return (
    <View style={st.bar}>
      <Pressable hitSlop={10} onPress={onBack} style={{ width: 44, height: 44, justifyContent: 'center' }} accessibilityLabel={close ? 'Close' : 'Back'}>
        <Icon name={close ? 'x' : 'back'} />
      </Pressable>
      <T size={19} style={{ flex: 1, textAlign: 'center' }}>
        {title ?? ''}
      </T>
      <View style={{ width: 44 }} />
    </View>
  );
}

export function MyHealth({ snap }: { snap: Snapshot }) {
  const last30 = snap.days.slice(-30);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const rows: { label: string; value: string; series: number[]; color: string }[] = [
    { label: 'Readiness · 30-day average', value: `${Math.round(avg(last30.map((d) => snap.scores[d.date].readiness ?? 0).filter(Boolean)))}`, series: last30.map((d) => snap.scores[d.date].readiness ?? 0), color: colors.teal },
    { label: 'Sleep · 30-day average', value: hm(avg(last30.map((d) => d.sleep?.totalMin ?? 0).filter(Boolean))), series: last30.map((d) => d.sleep?.totalMin ?? 0), color: colors.lilac },
    { label: 'Resting heart rate', value: `${Math.round(avg(last30.map((d) => d.restingHr ?? 0).filter(Boolean)))} bpm`, series: last30.map((d) => d.restingHr ?? 0).filter(Boolean), color: colors.rose },
    { label: 'HRV', value: `${Math.round(avg(last30.map((d) => d.hrvMs ?? 0).filter(Boolean)))} ms`, series: last30.map((d) => d.hrvMs ?? 0).filter(Boolean), color: colors.sky },
    { label: 'Steps · daily average', value: Math.round(avg(last30.map((d) => d.steps))).toLocaleString(), series: last30.map((d) => d.steps), color: colors.sky },
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}>
      <T size={19} style={{ textAlign: 'center', marginVertical: 4 }}>
        My Health
      </T>
      {rows.map((r) => (
        <Card key={r.label}>
          <T color={colors.ink2}>{r.label}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <T size={28} style={{ flex: 1 }}>
              {r.value}
            </T>
            <Spark values={r.series} color={r.color} height={44} style={{ width: 140 }} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

export function Profile({ onBack }: { onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 30, overflow: 'hidden' }}>
        <Glow color="#1f4040" id="prof" y="0%" radius="90%" />
        <SubBar onBack={onBack} />
        <View style={{ alignItems: 'center', marginTop: 18 }}>
          <Icon name="user" size={44} />
          <T weight="bold" size={13} style={{ letterSpacing: 2.4, marginTop: 18 }}>
            MY PROFILE
          </T>
          <T serif size={38} style={{ textAlign: 'center', marginTop: 16, maxWidth: 300 }}>
            Make your profile uniquely yours.
          </T>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <ListGroup>
          <ListRow label="Date of birth" value="Set in Oura" />
          <ListRow label="Weight" value="Set in Oura" />
          <ListRow label="Height" value="Set in Oura" />
          <ListRow label="Sex assigned at birth" value="Female" last />
        </ListGroup>
        <GroupLabel>Goals and focus areas</GroupLabel>
        <ListGroup>
          <ListRow icon="focus" label="Focus area" sub="Improve my health" right={<Icon name="chev" />} last />
        </ListGroup>
        <GroupLabel>Women's health</GroupLabel>
        <ListGroup>
          <ListRow icon="uterus" label="Intention" sub="Track my cycle" right={<Icon name="chev" />} last />
        </ListGroup>
      </View>
    </ScrollView>
  );
}

export function Devices({ onBack, snap }: { onBack: () => void; snap: Snapshot }) {
  const lastSync = snap.days[snap.days.length - 1].hr.at(-1)?.t;
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, gap: 16 }}>
      <SubBar title="My Devices" onBack={onBack} close />
      <Card glow="#4a4048" style={{ alignItems: 'center' }}>
        <View style={{ alignSelf: 'stretch' }}>
          <T size={28}>Ring 4 Ceramic</T>
          <T size={17}>Petal, Size 9</T>
        </View>
        <View style={st.ringArt}>
          <Icon name="ring" size={120} color={colors.cream} />
        </View>
        <T weight="bold" size={18}>
          {lastSync ? 'Synced' : 'Waiting for data'}
        </T>
        <T size={17} style={{ marginTop: 6 }}>
          Battery and ring controls live in the Oura app
        </T>
      </Card>
      <ListGroup>
        <ListRow icon="pin" color={colors.sky} label="Locate" onPress={() => Linking.openURL(OURA_STORE)} />
        <ListRow icon="reset" color={colors.sky} label="Soft reset" onPress={() => Linking.openURL(OURA_STORE)} />
        <ListRow icon="reset" color={colors.danger} label="Factory reset" onPress={() => Linking.openURL(OURA_STORE)} last />
      </ListGroup>
      <T size={14} color={colors.ink3}>
        These open the Oura app, which keeps talking to the ring and passing its readings to this app.
      </T>
      <GroupLabel>Wear and care</GroupLabel>
      <ListGroup>
        {[
          ['Caring For Your Ring', 'https://support.ouraring.com'],
          ['Charging Your Ring', 'https://support.ouraring.com'],
        ].map(([label, url], i, a) => (
          <ListRow key={label} label={label} right={<Icon name="ext" />} onPress={() => Linking.openURL(url)} last={i === a.length - 1} />
        ))}
      </ListGroup>
    </ScrollView>
  );
}

export function Settings({ onBack, status, source, onConnect, onReload }: { onBack: () => void; status: HcStatus | 'loading'; source: Snapshot['source']; onConnect: () => void; onReload: () => void }) {
  const label =
    status === 'ready' ? (source === 'health-connect' ? 'Connected' : 'Connected, no data yet') : status === 'needs-install' ? 'Install Health Connect' : status === 'needs-permission' ? 'Tap to allow' : status === 'loading' ? 'Checking…' : 'Android only';
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, gap: 12 }}>
      <SubBar title="Settings" onBack={onBack} />
      <GroupLabel>Ring data</GroupLabel>
      <ListGroup>
        <ListRow label="Health Connect" value={label} onPress={status === 'needs-install' ? () => Linking.openURL('market://details?id=com.google.android.apps.healthdata') : onConnect} />
        <ListRow label="Manage what Halo can read" right={<Icon name="ext" />} onPress={() => openHealthConnectSettings()} />
        <ListRow label="Refresh now" onPress={onReload} last />
      </ListGroup>
      <T size={14} color={colors.ink3}>
        In the Oura app, turn on Settings → Data sharing → Health Connect so new nights flow in here.
      </T>
      <GroupLabel>General</GroupLabel>
      <ListGroup>
        <ListRow label="Units" value="Imperial" />
        <ListRow label="Country of residence" value="United States" last />
      </ListGroup>
      <GroupLabel>Account</GroupLabel>
      <ListGroup>
        <ListRow label="Oura membership" sub="Used for Oura's own scores while active" right={<Icon name="ext" />} onPress={() => Linking.openURL('https://membership.ouraring.com')} last />
      </ListGroup>
    </ScrollView>
  );
}

export function Drawer({ open, onClose, go, toast }: { open: boolean; onClose: () => void; go: (screen: string) => void; toast: (m: string) => void }) {
  const items: ([IconName, string, () => void] | null)[] = [
    ['user', 'My Profile', () => go('profile')],
    ['ring', 'My Devices', () => go('devices')],
    ['sliders', 'Settings', () => go('settings')],
    ['help', 'Help', () => Linking.openURL('https://support.ouraring.com')],
    null,
    ['trend', 'Trends', () => go('health')],
    ['bars', 'Reports', () => go('health')],
    ['fork', 'Meals', () => go('add')],
    ['bed', 'Rest Mode', () => toast('Rest Mode is set in the Oura app')],
    ['lungs', 'Blood Oxygen', () => go('vitals:heart')],
  ];
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.scrim} onPress={onClose} />
      <View style={st.drawer}>
        <T size={26} style={{ letterSpacing: 2, marginBottom: 18 }}>
          HALO
        </T>
        {items.map((it, i) =>
          it ? (
            <Pressable key={it[1]} onPress={it[2]} style={st.mi}>
              <Icon name={it[0]} size={28} />
              <T weight="bold" size={19}>
                {it[1]}
              </T>
            </Pressable>
          ) : (
            <View key={i} style={{ height: 1, backgroundColor: colors.line, marginVertical: 12 }} />
          ),
        )}
      </View>
    </Modal>
  );
}

export function AddSheet({ open, onClose, onLogPeriod, onAdd }: { open: boolean; onClose: () => void; onLogPeriod: () => void; onAdd: (t: Tag) => void }) {
  const [kind, setKind] = useState<Tag['kind'] | null>(null);
  const [text, setText] = useState('');
  const close = () => {
    setKind(null);
    setText('');
    onClose();
  };
  const opts: [IconName, string, () => void][] = [
    ['tag', 'Add a tag', () => setKind('tag')],
    ['flame', 'Add an activity', () => setKind('activity')],
    ['fork', 'Log a meal', () => setKind('meal')],
    ['drop', 'Log period', () => (onLogPeriod(), close())],
  ];
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={st.scrim} onPress={close} />
      <View style={st.sheet}>
        <View style={st.grab} />
        {kind ? (
          <>
            <T size={22} weight="medium" style={{ marginBottom: 12 }}>
              {kind === 'meal' ? 'What did you eat?' : kind === 'activity' ? 'What did you do?' : 'Add a tag'}
            </T>
            <TextInput
              autoFocus
              value={text}
              onChangeText={setText}
              placeholder={kind === 'meal' ? 'Salad, coffee…' : kind === 'activity' ? 'Walk, yoga…' : 'Headache, alcohol, late meal…'}
              placeholderTextColor={colors.ink3}
              style={st.input}
            />
            <Pressable
              onPress={() => {
                if (text.trim()) onAdd({ t: Date.now(), kind, text: text.trim() });
                close();
              }}
              style={[st.save]}
            >
              <T weight="bold" size={17} color="#1b1b1d">
                Save
              </T>
            </Pressable>
          </>
        ) : (
          <>
            <T size={22} weight="medium" style={{ marginBottom: 12 }}>
              Add to today
            </T>
            {opts.map(([ic, label, fn], i) => (
              <Pressable key={label} onPress={fn} style={[st.opt, i === opts.length - 1 && { borderBottomWidth: 0 }]}>
                <Icon name={ic} fill={ic === 'drop' ? colors.ink : undefined} />
                <T size={18}>{label}</T>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  ringArt: { width: 220, height: 220, borderRadius: 110, borderWidth: 8, borderColor: colors.cream, alignItems: 'center', justifyContent: 'center', marginVertical: 22 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#000a' },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '78%', maxWidth: 340, backgroundColor: '#17181b', paddingTop: 48, paddingHorizontal: 20 },
  mi: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingVertical: 15 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingBottom: 36 },
  grab: { width: 40, height: 4, borderRadius: 4, backgroundColor: '#ffffff33', alignSelf: 'center', marginBottom: 16 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  input: { backgroundColor: colors.surface2, borderRadius: 14, color: colors.ink, fontSize: 18, padding: 14 },
  save: { marginTop: 16, backgroundColor: colors.cream, borderRadius: 999, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
});
