import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Updates from 'expo-updates';

const extra = (Constants.expoConfig?.extra ?? {}) as { buildNumber?: number; native?: number; releaseRepo?: string };
export const currentBuild = extra.buildNumber ?? 1;
const currentNative = extra.native ?? 1;

type Release = { build: number; native: number; apkUrl: string };

async function latestRelease(): Promise<Release | null> {
  if (!extra.releaseRepo) return null;
  const res = await fetch(`https://api.github.com/repos/${extra.releaseRepo}/releases/tags/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const build = Number(/build (\d+)/i.exec(json.name ?? '')?.[1]);
  const native = Number(/native (\d+)/i.exec(json.name ?? '')?.[1] || 1);
  const apk = (json.assets ?? []).find((a: any) => String(a.name).endsWith('.apk'));
  return build && apk ? { build, native, apkUrl: apk.browser_download_url } : null;
}

/** Downloads a live update if one is waiting. Returns true when one is ready to restart into. */
async function fetchLive(): Promise<boolean> {
  if (!Updates.isEnabled) return false;
  const { isAvailable } = await Updates.checkForUpdateAsync();
  if (!isAvailable) return false;
  const { isNew } = await Updates.fetchUpdateAsync();
  return isNew;
}

/**
 * Checks for updates each time the app comes to the front. Most come over the air (`live`) and
 * only need a restart; a new APK (`available`) is offered only when native code changed.
 */
export function useUpdate() {
  const [available, setAvailable] = useState<Release | null>(null);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    try {
      const rel = await latestRelease();
      // With live updates on, an APK is only needed when its native version moved on.
      const needsApk = Updates.isEnabled ? rel && rel.native > currentNative : rel && rel.build > currentBuild;
      setAvailable(needsApk ? rel : null);
      if (!needsApk && (await fetchLive())) setLive(true);
    } catch {
      // Offline or GitHub unreachable: try again next time she opens the app.
    }
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);

  const install = useCallback(async () => {
    if (!available) return;
    setBusy(true);
    try {
      if (Platform.OS !== 'android') return void Linking.openURL(available.apkUrl);
      const dest = `${FileSystem.cacheDirectory}Halo-${available.build}.apk`;
      await FileSystem.downloadAsync(available.apkUrl, dest);
      const uri = await FileSystem.getContentUriAsync(dest);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: uri,
        type: 'application/vnd.android.package-archive',
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });
    } catch {
      // If the in-app install fails, let the browser download it instead.
      Linking.openURL(available.apkUrl);
    } finally {
      setBusy(false);
    }
  }, [available]);

  const restart = useCallback(() => {
    setBusy(true);
    Updates.reloadAsync().catch(() => setBusy(false));
  }, []);

  return {
    available,
    live,
    busy,
    install,
    restart,
    dismiss: () => {
      setAvailable(null);
      setLive(false);
    },
  };
}
