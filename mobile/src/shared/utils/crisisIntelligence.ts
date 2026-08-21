export type AlertPriorityInput = {
  severity: 'info' | 'warning' | 'emergency';
  distanceKm: number;
  recencyMinutes: number;
  status: string;
};

export type CrisisIntelligenceInput = {
  severity: 'High' | 'Medium' | 'Low' | string;
  distanceKm: number | null;
  recencyMinutes: number;
  status: string;
  hasEvidence: boolean;
  similarReportsCount: number;
};

export type PriorityResult = {
  priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  priorityScore: number;
  explanation: string;
};

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  if (![lat1, lon1, lat2, lon2].every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return Number.NaN;
  }

  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function getAlertRelevanceLabel(distanceKm: number, userRadiusKm: number) {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(userRadiusKm)) {
    return 'Unknown';
  }

  if (distanceKm <= userRadiusKm / 2) {
    return 'Highly relevant';
  }

  if (distanceKm <= userRadiusKm) {
    return 'Relevant';
  }

  return 'Outside preferred radius';
}

export function buildPriorityScore(input: AlertPriorityInput) {
  const severityWeight = input.severity === 'emergency' ? 40 : input.severity === 'warning' ? 25 : 10;
  const proximityWeight = input.distanceKm <= 1 ? 25 : input.distanceKm <= 3 ? 15 : 5;
  const recencyWeight = input.recencyMinutes <= 10 ? 15 : input.recencyMinutes <= 60 ? 8 : 3;
  const statusWeight = input.status === 'VERIFIED' || input.status === 'ACTIVE' ? 10 : 0;
  return severityWeight + proximityWeight + recencyWeight + statusWeight;
}

export function calculateCrisisPriority(input: CrisisIntelligenceInput): PriorityResult {
  let score = 0;
  const factors: string[] = [];

  // 1. Severity (Max 40)
  const isHighSeverity = input.severity === 'High' || input.severity === 'emergency';
  if (isHighSeverity) {
    score += 40;
    factors.push('High severity');
  } else if (input.severity === 'Medium' || input.severity === 'warning') {
    score += 25;
    factors.push('Medium severity');
  } else {
    score += 10;
    factors.push('Low severity');
  }

  // 2. Distance (Max 25)
  if (input.distanceKm !== null && Number.isFinite(input.distanceKm)) {
    if (input.distanceKm <= 1) {
      score += 25;
      factors.push(`${input.distanceKm.toFixed(1)} km away`);
    } else if (input.distanceKm <= 3) {
      score += 15;
      factors.push(`${input.distanceKm.toFixed(1)} km away`);
    } else if (input.distanceKm <= 10) {
      score += 5;
    }
  }

  // 3. Recency (Max 15)
  if (input.recencyMinutes <= 15) {
    score += 15;
    factors.push('recently reported');
  } else if (input.recencyMinutes <= 60) {
    score += 8;
  }

  // 4. Verification & Context (Max 20)
  const isVerified = input.status === 'Verified' || input.status === 'VERIFIED' || input.status === 'ACTIVE' || input.status === 'Active';
  if (isVerified) {
    score += 10;
    factors.push('is verified');
  }
  if (input.hasEvidence) {
    score += 5;
    factors.push('is supported by evidence');
  }
  if (input.similarReportsCount > 0) {
    score += 5;
    factors.push(`has ${input.similarReportsCount} similar report${input.similarReportsCount > 1 ? 's' : ''}`);
  }

  // Determine Level
  let level: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';
  if (score >= 80) {
    level = 'Critical';
  } else if (score >= 60) {
    level = 'High';
  } else if (score >= 40) {
    level = 'Medium';
  }

  // Generate Explanation
  let explanation = `${level} priority because the incident is `;
  if (factors.length === 1) {
    explanation += `${factors[0]}.`;
  } else if (factors.length === 2) {
    explanation += `${factors[0]} and ${factors[1]}.`;
  } else if (factors.length > 2) {
    const last = factors.pop();
    explanation += `${factors.join(', ')}, and ${last}.`;
  } else {
    explanation += 'missing critical context.';
  }

  return {
    priorityLevel: level,
    priorityScore: score,
    explanation,
  };
}

export function detectPossibleDuplicate(
  current: {
    category?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    createdAt?: string;
  },
  candidate: {
    category?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    createdAt?: string;
  }
) {
  const sameCategory = current.category && candidate.category && current.category.toLowerCase() === candidate.category.toLowerCase();
  const sameDescription = current.description && candidate.description && current.description.toLowerCase().includes(candidate.description.toLowerCase()) || candidate.description?.toLowerCase().includes(current.description?.toLowerCase() ?? '');
  const sameTimeWindow = (() => {
    if (!current.createdAt || !candidate.createdAt) {
      return false;
    }

    const currentTime = Date.parse(current.createdAt);
    const candidateTime = Date.parse(candidate.createdAt);
    if (Number.isNaN(currentTime) || Number.isNaN(candidateTime)) {
      return false;
    }

    return Math.abs(candidateTime - currentTime) <= 10 * 60 * 1000;
  })();

  const distance =
    current.latitude != null && current.longitude != null && candidate.latitude != null && candidate.longitude != null
      ? calculateDistanceKm(current.latitude, current.longitude, candidate.latitude, candidate.longitude)
      : Number.NaN;

  const sameLocation = Number.isFinite(distance) && distance <= 0.1;

  return {
    isPossibleDuplicate: Boolean(sameCategory && sameLocation && sameTimeWindow) || Boolean(sameDescription && sameLocation && sameTimeWindow),
    distanceKm: Number.isFinite(distance) ? distance : null,
  };
}
