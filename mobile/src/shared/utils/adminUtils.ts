import type { Incident } from '../types/app';
import { normalizeIncidentStatus } from './incidentWorkflow';

export type AdminStatusFilter = 'ALL' | 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'REJECTED' | 'RESOLVED';
export type AdminSeverityFilter = 'ALL' | 'High' | 'Medium' | 'Low';

export type AdminFilterOptions = {
  searchQuery: string;
  status: AdminStatusFilter;
  severity: AdminSeverityFilter;
  category: string; // 'ALL' or specific category
};

/**
 * Pure function to filter and search incidents for the Admin dashboard.
 * Evaluates all filter dimensions independently and combines them with AND logic.
 * Does not mutate the original array.
 */
export function filterAdminIncidents(incidents: Incident[], options: AdminFilterOptions): Incident[] {
  const { searchQuery, status, severity, category } = options;
  const lowerQuery = searchQuery.trim().toLowerCase();

  return incidents.filter((incident) => {
    // 1. Status Filter
    if (status !== 'ALL') {
      const normalizedStatus = normalizeIncidentStatus(incident.status);
      if (status === 'PENDING' && normalizedStatus !== 'PENDING_REVIEW' && normalizedStatus !== 'SUBMITTED') {
        return false;
      }
      if (status === 'VERIFIED' && normalizedStatus !== 'VERIFIED') {
        return false;
      }
      if (status === 'ACTIVE' && normalizedStatus !== 'ACTIVE') {
        return false;
      }
      if (status === 'REJECTED' && normalizedStatus !== 'REJECTED') {
        return false;
      }
      if (status === 'RESOLVED' && normalizedStatus !== 'RESOLVED') {
        return false;
      }
    }

    // 2. Severity Filter
    if (severity !== 'ALL') {
      if (incident.severity !== severity) {
        return false;
      }
    }

    // 3. Category Filter
    if (category !== 'ALL') {
      // Handle cases where category might be empty or missing
      const incCategory = incident.category || 'Other';
      if (incCategory !== category) {
        return false;
      }
    }

    // 4. Search Query (Title, Category, Location)
    if (lowerQuery) {
      const titleMatch = incident.title?.toLowerCase().includes(lowerQuery) ?? false;
      const catMatch = incident.category?.toLowerCase().includes(lowerQuery) ?? false;
      const locMatch = incident.location?.toLowerCase().includes(lowerQuery) ?? false;
      
      if (!titleMatch && !catMatch && !locMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extracts a unique, sorted list of categories from the current incidents.
 * Used to populate the dynamic category filter chips.
 */
export function extractUniqueCategories(incidents: Incident[]): string[] {
  const cats = new Set<string>();
  for (const inc of incidents) {
    cats.add(inc.category || 'Other');
  }
  return Array.from(cats).sort();
}
