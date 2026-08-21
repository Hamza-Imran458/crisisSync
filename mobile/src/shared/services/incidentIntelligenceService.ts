import type { Incident } from '../types/app';
import { buildPriorityScore, calculateDistanceKm, getAlertRelevanceLabel, calculateCrisisPriority, type PriorityResult } from '../utils/crisisIntelligence';
import { requestUserLocation } from './locationService';
import { evidenceService, getEvidenceSummaryForIncidentIds } from './evidenceService';

export type IncidentIntelligence = {
  distanceKm: number | null;
  relevanceLabel: string;
  priorityScore: number;
  priorityLevel?: PriorityResult['priorityLevel'];
  priorityExplanation?: string;
  hasCoordinates: boolean;
  locationStatus: 'available' | 'unavailable' | 'permission-denied';
};

export async function enrichIncidentWithLocation(
  incident: Incident,
  userLatitude?: number,
  userLongitude?: number,
  userRadiusKm = 3
): Promise<IncidentIntelligence> {
  const latitude = (incident as Incident & { latitude?: number | null }).latitude;
  const longitude = (incident as Incident & { longitude?: number | null }).longitude;

  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      distanceKm: null,
      relevanceLabel: 'Location unavailable',
      priorityScore: 0,
      hasCoordinates: false,
      locationStatus: 'unavailable',
    };
  }

  if (typeof userLatitude !== 'number' || typeof userLongitude !== 'number' || !Number.isFinite(userLatitude) || !Number.isFinite(userLongitude)) {
    return {
      distanceKm: null,
      relevanceLabel: 'Location unavailable',
      priorityScore: 0,
      hasCoordinates: true,
      locationStatus: 'unavailable',
    };
  }

  const distanceKm = calculateDistanceKm(userLatitude, userLongitude, latitude, longitude);
  const relevanceLabel = getAlertRelevanceLabel(distanceKm, userRadiusKm);

  // Fallback recency calculation if createdAt is missing, defaulting to recent to be safe
  const recencyMinutes = incident.createdAt 
    ? (Date.now() - new Date(incident.createdAt).getTime()) / 60000 
    : 15;

  const evidenceSummary = (await getEvidenceSummaryForIncidentIds([incident.id]))[incident.id] ?? { hasEvidence: false, evidenceCount: 0 };

  const crisisPriority = calculateCrisisPriority({
    severity: incident.severity ?? 'Medium',
    distanceKm,
    recencyMinutes,
    status: incident.status,
    hasEvidence: evidenceSummary.hasEvidence,
    similarReportsCount: 0,
  });

  // Keep legacy priorityScore for backward compatibility with AlertPriorityInput, but prefer the unified one
  const legacyPriorityScore = buildPriorityScore({
    severity: incident.severity === 'High' ? 'emergency' : incident.severity === 'Medium' ? 'warning' : 'info',
    distanceKm,
    recencyMinutes,
    status: incident.status,
  });

  return {
    distanceKm,
    relevanceLabel,
    priorityScore: crisisPriority.priorityScore,
    priorityLevel: crisisPriority.priorityLevel,
    priorityExplanation: crisisPriority.explanation,
    hasCoordinates: true,
    locationStatus: 'available',
  };
}

export async function getUserLocationForApp() {
  try {
    return await requestUserLocation();
  } catch (error) {
    return {
      latitude: null,
      longitude: null,
      permissionDenied: true,
      error: error instanceof Error ? error.message : 'Location unavailable',
    };
  }
}

export type ConfidenceResult = {
  confidenceLevel: 'High' | 'Medium' | 'Low';
  confidenceReason: string;
};

export function calculateIncidentConfidence(
  incident: Incident,
  hasEvidence: boolean,
  duplicateSimilarities: number = 0
): ConfidenceResult {
  let score = 0;
  const reasons: string[] = [];

  // Verification
  if (incident.status === 'Verified' || incident.status === 'Resolved') {
    score += 50;
    reasons.push('verified status');
  }

  // Evidence
  if (hasEvidence) {
    score += 30;
    reasons.push('supported by evidence');
  }

  // Severity Consistency
  if (incident.severity === 'High') {
    score += 10;
    reasons.push('high severity priority');
  }

  // Duplicate penalty
  if (duplicateSimilarities > 0) {
    score -= (duplicateSimilarities * 15);
    reasons.push('similar to existing incidents');
  }

  let level: 'High' | 'Medium' | 'Low' = 'Low';
  if (score >= 70) {
    level = 'High';
  } else if (score >= 40) {
    level = 'Medium';
  }

  const baseReason = level === 'High' ? 'High confidence because' : level === 'Medium' ? 'Medium confidence because' : 'Low confidence because';
  const reasonText = reasons.length > 0 ? `${baseReason} it is ${reasons.join(' and ')}.` : `${baseReason} of insufficient supporting data.`;

  return {
    confidenceLevel: level,
    confidenceReason: reasonText,
  };
}
