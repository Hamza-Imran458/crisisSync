import type { IncidentSeverity } from '../types/app';
import type { EscalationLevel } from './escalationEngine';

export type ResponseLevel = 'IMMEDIATE' | 'URGENT' | 'STANDARD' | 'MONITOR';

export type ResponseRecommendationInput = {
  category: string;
  severity: IncidentSeverity;
  priorityLevel: string;
  confidenceLevel: string;
  escalationLevel: EscalationLevel;
  distanceKm: number | null;
  isVerified: boolean;
};

export type ResponseRecommendation = {
  responseLevel: ResponseLevel;
  responseTitle: string;
  responseExplanation: string;
  recommendedActions: string[];
};

/**
 * Deterministically calculates a recommended operational response.
 * This does NOT fabricate resources or autonomously dispatch emergency services.
 */
export function determineResponseRecommendation(input: ResponseRecommendationInput): ResponseRecommendation {
  const {
    category,
    severity,
    escalationLevel,
    isVerified,
    distanceKm
  } = input;

  const normalizedCategory = (category || 'Unknown').trim().toLowerCase();
  
  // 1. Determine Response Level
  let responseLevel: ResponseLevel = 'MONITOR';
  
  if (escalationLevel === 'CRITICAL') {
    responseLevel = 'IMMEDIATE';
  } else if (escalationLevel === 'URGENT' || (severity === 'High' && isVerified)) {
    responseLevel = 'URGENT';
  } else if (severity === 'Medium' || escalationLevel === 'REVIEW') {
    responseLevel = 'STANDARD';
  }

  // 2. Determine Category-Specific Title and Actions
  let responseTitle = 'General emergency assessment';
  let recommendedActions: string[] = [];
  
  switch (normalizedCategory) {
    case 'fire':
      responseTitle = 'Fire/emergency response';
      if (responseLevel === 'IMMEDIATE' || responseLevel === 'URGENT') {
        recommendedActions.push('Assess fire response requirements.');
        if (escalationLevel === 'CRITICAL') {
          recommendedActions.push('Notify operations supervisor immediately.');
        }
      } else {
        recommendedActions.push('Monitor fire containment status.');
      }
      break;
      
    case 'flooding':
      responseTitle = 'Rescue/evacuation assessment';
      if (responseLevel === 'IMMEDIATE' || responseLevel === 'URGENT') {
        recommendedActions.push('Assess immediate evacuation needs.');
        recommendedActions.push('Monitor water levels closely.');
      } else {
        recommendedActions.push('Monitor affected area for water level changes.');
      }
      break;
      
    case 'medical':
      responseTitle = 'Medical response assessment';
      if (responseLevel === 'IMMEDIATE' || responseLevel === 'URGENT') {
        recommendedActions.push('Prioritize medical assessment based on severity.');
        if (escalationLevel === 'CRITICAL') {
          recommendedActions.push('Prepare for potential critical medical escalation.');
        }
      } else {
        recommendedActions.push('Monitor patient status.');
      }
      break;
      
    case 'security':
      responseTitle = 'Security response assessment';
      if (responseLevel === 'IMMEDIATE' || responseLevel === 'URGENT') {
        recommendedActions.push('Prioritize security personnel assessment.');
        recommendedActions.push('Establish safety perimeter if necessary.');
      } else {
        recommendedActions.push('Monitor situation for escalation.');
      }
      break;
      
    default:
      if (responseLevel === 'IMMEDIATE' || responseLevel === 'URGENT') {
        recommendedActions.push('Prioritize general assessment based on severity.');
      } else {
        recommendedActions.push('Continue standard monitoring.');
      }
      break;
  }
  
  // Universal Actions
  if (!isVerified && responseLevel !== 'MONITOR') {
    recommendedActions.unshift('Verify incident details and gather evidence.');
  }

  // 3. Generate Explanation
  let explanationParts = [];
  explanationParts.push(`This is a ${responseLevel.toUpperCase()} response scenario.`);
  explanationParts.push(`Based on a ${severity.toLowerCase()}-severity ${category || 'unknown'} incident.`);
  
  if (escalationLevel === 'CRITICAL' || escalationLevel === 'URGENT') {
    explanationParts.push(`Escalation level is ${escalationLevel}, requiring prioritized attention.`);
  }

  if (distanceKm !== null && distanceKm < 5) {
    explanationParts.push(`Incident is in close proximity (${distanceKm.toFixed(1)} km).`);
  }

  if (!isVerified) {
    explanationParts.push('Caution: Incident is currently unverified.');
  }
  
  return {
    responseLevel,
    responseTitle,
    responseExplanation: explanationParts.join(' '),
    recommendedActions
  };
}
