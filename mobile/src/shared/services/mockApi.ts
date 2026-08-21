import type { AlertItem, Incident } from '../types/app';

export async function fetchIncidents(): Promise<Incident[]> {
  return [
    {
      id: 'inc-1',
      title: 'Flood warning',
      description: 'Water levels are rising near East Avenue. Avoid the lower road.',
      category: 'Flooding',
      severity: 'High',
      location: 'East Avenue',
      distanceKm: 2.3,
      createdAt: '5 min ago',
      status: 'Verified',
    },
    {
      id: 'inc-2',
      title: 'Power outage',
      description: 'Service disruption reported in River District. Residents should conserve power.',
      category: 'Infrastructure',
      severity: 'Medium',
      location: 'River District',
      distanceKm: 1.1,
      createdAt: '12 min ago',
      status: 'Pending',
    },
  ];
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  return [
    {
      id: 'alert-1',
      title: 'Evacuation alert in Zone B',
      body: 'Residents within 2 km are advised to move to the north shelter immediately.',
      severity: 'emergency',
      createdAt: '2 min ago',
    },
    {
      id: 'alert-2',
      title: 'Road closure near River Road',
      body: 'Avoid the route until authorities clear the area.',
      severity: 'warning',
      createdAt: '10 min ago',
    },
  ];
}
