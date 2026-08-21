import React, { useEffect } from 'react';

import { AppStoreProvider } from './src/shared/state/appStore';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import { notificationService } from './src/shared/services/notificationService';

// DEV: Toggle this to `true` to run the isolated Map test screen for native crash diagnosis.
const RENDER_MAP_TEST = false;

export default function App() {
  useEffect(() => {
    notificationService.init();
  }, []);

  if (RENDER_MAP_TEST && __DEV__) {
    // Lazy-load to avoid bundling conditionally in production.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const MapTest = require('./src/features/map/screens/MapIsolatedTestScreen').default;
    return <MapTest />;
  }

  return (
    <AppStoreProvider>
      <AppNavigator />
    </AppStoreProvider>
  );
}