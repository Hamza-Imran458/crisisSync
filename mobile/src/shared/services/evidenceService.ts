import { supabase } from './supabase';
import { logger } from '../utils/logger';
import { auditService } from './auditService';
import type { IncidentEvidence } from '../types/app';

const isReactNative = typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative';

async function ensureBucketExists(bucketId: string) {
  const { data, error } = await supabase.storage.from(bucketId).list('', { limit: 1 });
  if (error) {
    const msg = String((error as any).message || '').toLowerCase();
    if (msg.includes('bucket not found') || msg.includes('not found')) {
      throw new Error(`Supabase Storage bucket "${bucketId}" not found. Create it via the Supabase dashboard or run the Phase3 storage setup (see db/phase3_schema_migrations.sql comments).`);
    }
    throw error;
  }
  return true;
}

export type EvidenceSummary = {
  hasEvidence: boolean;
  evidenceCount: number;
};

export function validateEvidenceUploadInput(
  incidentId: string,
  fileType: string
): { valid: boolean; reason?: string } {
  if (!incidentId?.trim()) {
    return { valid: false, reason: 'Incident ID is required.' };
  }

  const normalizedType = (fileType ?? '').trim();
  if (!normalizedType) {
    return { valid: false, reason: 'A valid file type is required.' };
  }

  return { valid: true };
}

export function summarizeEvidenceRecords(
  records: Array<Partial<IncidentEvidence> | null | undefined>
): EvidenceSummary {
  const validRecords = (records ?? []).filter((record): record is Partial<IncidentEvidence> => {
    return record != null && typeof record.filePath === 'string' && record.filePath.trim().length > 0;
  });

  return {
    hasEvidence: validRecords.length > 0,
    evidenceCount: validRecords.length,
  };
}

function mapEvidenceRow(row: Record<string, unknown>): IncidentEvidence {
  return {
    id: String(row.id ?? ''),
    incidentId: String(row.incident_id ?? ''),
    uploadedBy: typeof row.uploaded_by === 'string' ? row.uploaded_by : undefined,
    filePath: String(row.file_path ?? ''),
    fileType: String(row.file_type ?? 'unknown'),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function getEvidenceSummaryForIncidentIds(
  incidentIds: string[]
): Promise<Record<string, EvidenceSummary>> {
  const uniqueIds = [...new Set(incidentIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('incident_evidence')
      .select('*')
      .in('incident_id', uniqueIds);

    if (error) {
      logger.error('evidenceService: Error fetching evidence summary', error);
      throw error;
    }

    const counts = new Map<string, number>();
    for (const row of Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []) {
      const incidentId = String((row.incident_id as string | undefined) ?? '');
      if (!incidentId) {
        continue;
      }
      counts.set(incidentId, (counts.get(incidentId) ?? 0) + 1);
    }

    return Object.fromEntries(
      uniqueIds.map((incidentId) => {
        const count = counts.get(incidentId) ?? 0;
        return [incidentId, { hasEvidence: count > 0, evidenceCount: count }];
      })
    );
  } catch (error) {
    logger.warn('evidenceService: summarizing evidence failed; defaulting to no evidence.', error);
    return Object.fromEntries(uniqueIds.map((incidentId) => [incidentId, { hasEvidence: false, evidenceCount: 0 }]));
  }
}

export const evidenceService = {
  uploadEvidence: async (
    incidentId: string,
    localFilePath: string,
    fileType: string = 'image/jpeg'
  ): Promise<IncidentEvidence | null> => {
    return evidenceService.uploadIncidentEvidence(incidentId, localFilePath, fileType);
  },

  getIncidentEvidence: async (incidentId: string): Promise<IncidentEvidence[]> => {
    try {
      logger.info('evidenceService: Fetching evidence for incident', incidentId);

      const { data, error } = await supabase
        .from('incident_evidence')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('evidenceService: Error fetching evidence', error);
        throw error;
      }

      return (Array.isArray(data) ? data : []).map((row) => mapEvidenceRow(row as Record<string, unknown>));
    } catch (error) {
      logger.error('evidenceService: fetchIncidentEvidence failed', error);
      return [];
    }
  },

  fetchIncidentEvidence: async (incidentId: string): Promise<IncidentEvidence[]> => {
    return evidenceService.getIncidentEvidence(incidentId);
  },

  uploadIncidentEvidence: async (
    incidentId: string,
    localFilePath: string,
    fileType: string = 'image/jpeg'
  ): Promise<IncidentEvidence | null> => {
    try {
      logger.info('evidenceService: Uploading evidence for incident', incidentId);

      const validation = validateEvidenceUploadInput(incidentId, fileType);
      if (!validation.valid) {
        throw new Error(validation.reason ?? 'Unable to validate evidence upload.');
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (userError || !userId) {
        throw new Error('Authentication is required to upload evidence.');
      }

      const normalizedType = fileType.trim();
      const fileExtension = normalizedType.includes('image')
        ? 'jpg'
        : normalizedType.includes('video')
          ? 'mp4'
          : normalizedType.includes('pdf')
            ? 'pdf'
            : 'bin';

      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExtension}`;
      const storagePath = `${incidentId}/${fileName}`;

      const normalizedUri = localFilePath.trim();

      // Preflight: ensure the storage bucket exists so we can fail fast with
      // a clear instruction instead of a lower-level StorageApiError.
      await ensureBucketExists('incident-evidence');

      // On React Native, prefer the expo-blob polyfill to avoid expensive
      // Response.blob() copying through the native blob store.
      if (isReactNative) {
        try {
          // Dynamically require to avoid Jest/node resolving issues during tests
          // and only polyfill at runtime on device.
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('expo-blob');
        } catch (err) {
          logger.warn('evidenceService: expo-blob is not installed; falling back to default blob(). For large files this may be slower.');
        }
      }

      const fileResponse = await fetch(normalizedUri);
      if (!fileResponse.ok) {
        throw new Error(`Unable to read evidence file: ${fileResponse.status}`);
      }

      const fileBlob = await fileResponse.blob();

      const { error: uploadError } = await supabase.storage
        .from('incident-evidence')
        .upload(storagePath, fileBlob, {
          contentType: normalizedType,
          upsert: false,
        });

      if (uploadError) {
        logger.error('evidenceService: Storage upload failed', uploadError);

        // Helpful instruction when bucket is missing
        const msg = String((uploadError as any).message || '').toLowerCase();
        if (msg.includes('bucket not found') || msg.includes('not found')) {
          throw new Error('Supabase Storage bucket "incident-evidence" not found. Create it via the Supabase dashboard or run the Phase3 storage setup (see db/phase3_schema_migrations.sql comments).');
        }

        throw uploadError;
      }

      const insertData = {
        incident_id: incidentId,
        uploaded_by: userId,
        file_path: storagePath,
        file_type: normalizedType,
      };

      const { data, error } = await supabase
        .from('incident_evidence')
        .insert([insertData])
        .select('*')
        .single();

      if (error) {
        logger.error('evidenceService: Error inserting evidence record', error);
        throw error;
      }

      const createdEvidence = mapEvidenceRow(data as Record<string, unknown>);
      await auditService.logIncidentEvent({
        incidentId,
        eventType: 'EVIDENCE_UPLOADED',
        note: `Evidence uploaded: ${createdEvidence.fileType}`,
      });

      return createdEvidence;
    } catch (error) {
      logger.error('evidenceService: uploadIncidentEvidence failed', error);
      return null;
    }
  },

  deleteIncidentEvidence: async (evidenceId: string, filePath?: string): Promise<boolean> => {
    try {
      if (filePath) {
        const { error: storageError } = await supabase.storage.from('incident-evidence').remove([filePath]);
        if (storageError) {
          logger.warn('evidenceService: storage delete failed', storageError);
        }
      }

      const { error } = await supabase.from('incident_evidence').delete().eq('id', evidenceId);
      if (error) {
        logger.error('evidenceService: Error deleting evidence', error);
        throw error;
      }

      await auditService.logIncidentEvent({
        incidentId: evidenceId,
        eventType: 'EVIDENCE_REMOVED',
        note: filePath ? `Evidence removed from storage: ${filePath}` : 'Evidence removed',
      });

      return true;
    } catch (error) {
      logger.error('evidenceService: deleteIncidentEvidence failed', error);
      return false;
    }
  },

  hasIncidentEvidence: async (incidentId: string): Promise<boolean> => {
    try {
      const evidence = await evidenceService.getIncidentEvidence(incidentId);
      return summarizeEvidenceRecords(evidence).hasEvidence;
    } catch (error) {
      logger.warn('evidenceService: hasIncidentEvidence failed; defaulting to false', error);
      return false;
    }
  },
};

export { evidenceService as default };
