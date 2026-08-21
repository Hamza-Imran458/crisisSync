const path = require('path');

// Load local .env (mobile/.env) so process.env contains variables during prebuild.
// This file must NOT be committed to git. See .gitignore.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch (e) {
  // dotenv is an optional dev-time dep; ignore if missing
}

const appJson = require('./app.json');

// Read the Maps API key from the environment — never hardcode it here.
const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

if (!googleMapsApiKey) {
  console.warn(
    '[CrisisSync] WARNING: GOOGLE_MAPS_API_KEY is not set in mobile/.env. ' +
    'The map will not work on Android. Set the key and re-run prebuild.'
  );
}

module.exports = {
  ...appJson.expo,
  plugins: [
    // react-native-maps config plugin injects the API key into AndroidManifest.xml
    // as <meta-data android:name="com.google.android.geo.API_KEY" android:value="..." />
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
      },
    ],
  ],
};
