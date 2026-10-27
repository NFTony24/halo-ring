# Halo

A streamlined, ad-free companion app for an Oura Ring 4, built for one person. It keeps the
layout of the Oura app (Today, Vitals, My Health, side menu, + button) and drops the promos.

## Where the data comes from

- **Health Connect (Android).** The Oura app copies sleep, heart rate, HRV, steps, SpO2,
  breathing rate and skin temperature to Health Connect. Halo reads it from there, with or
  without an Oura membership.
- **Our own scores.** `src/data/scores.ts` works out Readiness, Sleep, Activity, daytime
  stress, sleep debt, regularity and cycle day from those raw readings, against her own
  30-day baseline. They are not Oura's formulas.
- **Calibration (next step).** While the membership is active, pull Oura's daily scores
  (API or "Back up all data" export) and fit `Calibration` with `fitLinear` so our scores
  track Oura's for her.

Before Health Connect is connected, the app shows clearly-marked sample data.

## Building

Every push to `main` runs `.github/workflows/android.yml`, which builds a signed APK and
attaches it to the `latest` release. Open that release on the phone and tap `Halo.apk`.

Signing uses two repo secrets, `KEYSTORE_BASE64` and `KEYSTORE_PASSWORD`. Keep the same key
forever, or Android will refuse to install an update over the old app.

Local checks:

```bash
npm ci
npx tsc --noEmit
npx expo export --platform android   # bundles the JS
```

Expo Go can't run this app (Health Connect is a native module); use the APK.
