// Stamps each GitHub build with its run number so the app can tell when a newer one exists.
const build = Number(process.env.BUILD_NUMBER || 1);

// Bump this whenever a change touches native code (a new library, permission or plugin).
// Builds with the same number take over-the-air updates; a new number means a new APK.
const native = 1;

// Set once the Expo project exists; until then live updates stay off and only APKs ship.
const projectId = process.env.EXPO_PROJECT_ID || '';

module.exports = ({ config }) => ({
  ...config,
  runtimeVersion: String(native),
  updates: projectId
    ? {
        url: `https://u.expo.dev/${projectId}`,
        requestHeaders: { 'expo-channel-name': 'production' },
        checkAutomatically: 'ON_LOAD',
        fallbackToCacheTimeout: 0,
      }
    : { enabled: false },
  android: {
    ...config.android,
    versionCode: build,
    permissions: [...config.android.permissions, 'android.permission.REQUEST_INSTALL_PACKAGES'],
  },
  extra: {
    ...config.extra,
    buildNumber: build,
    native,
    releaseRepo: 'NFTony24/halo-ring',
    ...(projectId ? { eas: { projectId } } : {}),
  },
});
