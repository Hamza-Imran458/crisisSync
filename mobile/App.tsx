import React, { useEffect } from 'react';

import { AppStoreProvider } from './src/shared/state/appStore';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import { notificationService } from './src/shared/services/notificationService';

export default function App() {
  useEffect(() => {
    notificationService.init();
  }, []);

  return (
    <AppStoreProvider>
      <AppNavigator />
    </AppStoreProvider>
  );
}