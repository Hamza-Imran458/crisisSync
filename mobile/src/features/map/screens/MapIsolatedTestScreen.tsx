import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView from 'react-native-maps';

export default function MapIsolatedTestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Minimal Map Test</Text>
      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 31.4949139,
            longitude: 74.2466163,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001233' },
  header: { color: '#fff', padding: 16, fontSize: 18, fontWeight: '600' },
  mapWrapper: { flex: 1, margin: 12, borderRadius: 8, overflow: 'hidden' },
  map: { flex: 1 },
});
