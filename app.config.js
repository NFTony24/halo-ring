// Stamps each GitHub build with its run number so the app can tell when a newer one exists.
const build = Number(process.env.BUILD_NUMBER || 1);

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: build,
    permissions: [...config.android.permissions, 'android.permission.REQUEST_INSTALL_PACKAGES'],
  },
  extra: { ...config.extra, buildNumber: build, releaseRepo: 'NFTony24/halo-ring' },
});
