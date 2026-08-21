export const Accuracy = {
  Balanced: 1,
  High: 2,
  Low: 0,
};

export async function requestForegroundPermissionsAsync() {
  return { status: 'granted' };
}

export async function getForegroundPermissionsAsync() {
  return { status: 'granted' };
}

export async function getCurrentPositionAsync(_options?: any) {
  return {
    coords: {
      latitude: 12.34,
      longitude: 56.78,
      accuracy: 5,
    },
    timestamp: Date.now(),
  };
}

export default {
  Accuracy,
  requestForegroundPermissionsAsync,
  getForegroundPermissionsAsync,
  getCurrentPositionAsync,
};
