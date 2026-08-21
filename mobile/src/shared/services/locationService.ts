import * as Location from 'expo-location';

export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: string;
};

export async function requestUserLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Location permission was denied.');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestamp: new Date(location.timestamp).toISOString(),
  } satisfies UserLocation;
}

export async function getLocationPermissionStatus() {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status;
}
