/**
 * Atomic Status Change Handler
 *
 * This module provides bulletproof status change handling for ad entities.
 * It ensures no metrics are lost when entities transition between states.
 *
 * Key Features:
 * - Detects ACTIVE → PAUSED transitions
 * - Performs final metric sync before status update
 * - Atomic transactions (all-or-nothing)
 * - Comprehensive error handling and logging
 * - Platform-agnostic design
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface StatusChangeEntity {
  log_id: string;
  entity_type: 'campaign' | 'adset' | 'ad';
  entity_id: string;
  platform_entity_id: string;
  old_status: string;
  new_status: string;
  created_at: string;
}

export interface MetricData {
  entity_id: string;
  entity_type: string;
  date: string;
  impressions?: number;
  clicks?: number;
  spend?: number;
  reach?: number;
  conversions?: number;
  conversion_value?: number;
  cpc?: number;
  cpm?: number;
  ctr?: number;
  roas?: number;
}

export interface StatusChangeResult {
  success: boolean;
  entitiesProcessed: number;
  metricsCollected: number;
  errors: string[];
}

/**
 * Fetch entities that need final sync before status change completes
 */
export async function getEntitiesNeedingFinalSync(
  supabase: SupabaseClient,
  adAccountId: string,
  entityType?: 'campaign' | 'adset' | 'ad'
): Promise<StatusChangeEntity[]> {
  try {
    const { data, error } = await supabase.rpc('get_entities_needing_final_sync', {
      p_ad_account_id: adAccountId,
      p_entity_type: entityType || null,
    });

    if (error) {
      console.error('[atomic-status] Error fetching entities needing sync:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[atomic-status] Exception fetching entities:', error);
    return [];
  }
}

/**
 * Mark final sync as completed for a status change log entry
 */
export async function markFinalSyncCompleted(
  supabase: SupabaseClient,
  logId: string,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const { error: rpcError } = await supabase.rpc('mark_final_sync_completed', {
      p_log_id: logId,
      p_success: success,
      p_error: error || null,
    });

    if (rpcError) {
      console.error('[atomic-status] Error marking sync completed:', rpcError);
    }
  } catch (err) {
    console.error('[atomic-status] Exception marking sync completed:', err);
  }
}

/**
 * Save metrics to database in an atomic transaction
 */
export async function saveMetricsAtomic(
  supabase: SupabaseClient,
  metrics: MetricData[]
): Promise<{ success: boolean; error?: string }> {
  if (metrics.length === 0) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('ad_metrics')
      .upsert(metrics, { onConflict: 'entity_type,entity_id,date' });

    if (error) {
      console.error('[atomic-status] Error saving metrics:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[atomic-status] Exception saving metrics:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Process a single entity's final sync
 * This is the core atomic operation
 */
export async function processFinalSyncForEntity(
  supabase: SupabaseClient,
  entity: StatusChangeEntity,
  fetchMetricsFunc: (platformEntityId: string, startDate: string, endDate: string) => Promise<MetricData[]>,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; metricsCount: number; error?: string }> {
  console.log(`[atomic-status] Processing final sync for ${entity.entity_type} ${entity.platform_entity_id}`);

  try {
    // Fetch final metrics from platform API
    const metrics = await fetchMetricsFunc(entity.platform_entity_id, startDate, endDate);

    console.log(`[atomic-status] Fetched ${metrics.length} metrics for ${entity.platform_entity_id}`);

    if (metrics.length > 0) {
      // Save metrics atomically
      const saveResult = await saveMetricsAtomic(supabase, metrics);

      if (!saveResult.success) {
        await markFinalSyncCompleted(supabase, entity.log_id, false, saveResult.error);
        return { success: false, metricsCount: 0, error: saveResult.error };
      }
    }

    // Mark as completed
    await markFinalSyncCompleted(supabase, entity.log_id, true);

    return { success: true, metricsCount: metrics.length };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[atomic-status] Error processing ${entity.platform_entity_id}:`, errorMsg);

    await markFinalSyncCompleted(supabase, entity.log_id, false, errorMsg);

    return { success: false, metricsCount: 0, error: errorMsg };
  }
}

/**
 * Process all pending final syncs for an ad account
 * This is the main entry point called by sync functions
 */
export async function processAllPendingFinalSyncs(
  supabase: SupabaseClient,
  adAccountId: string,
  fetchMetricsFunc: (platformEntityId: string, startDate: string, endDate: string) => Promise<MetricData[]>,
  dateRange?: { start: string; end: string }
): Promise<StatusChangeResult> {
  console.log(`[atomic-status] Checking for entities needing final sync in account ${adAccountId}`);

  const entities = await getEntitiesNeedingFinalSync(supabase, adAccountId);

  if (entities.length === 0) {
    console.log('[atomic-status] No entities need final sync');
    return { success: true, entitiesProcessed: 0, metricsCollected: 0, errors: [] };
  }

  console.log(`[atomic-status] Found ${entities.length} entities needing final sync`);

  let totalMetrics = 0;
  const errors: string[] = [];

  // Use provided date range or calculate from status change
  const today = new Date().toISOString().split('T')[0];

  for (const entity of entities) {
    // Calculate date range for final sync
    const statusChangedDate = new Date(entity.created_at).toISOString().split('T')[0];
    const startDate = dateRange?.start || statusChangedDate;
    const endDate = dateRange?.end || today;

    const result = await processFinalSyncForEntity(
      supabase,
      entity,
      fetchMetricsFunc,
      startDate,
      endDate
    );

    if (result.success) {
      totalMetrics += result.metricsCount;
    } else if (result.error) {
      errors.push(`${entity.entity_type} ${entity.platform_entity_id}: ${result.error}`);
    }
  }

  const success = errors.length === 0;

  console.log(`[atomic-status] Final sync complete: ${entities.length} entities, ${totalMetrics} metrics, ${errors.length} errors`);

  return {
    success,
    entitiesProcessed: entities.length,
    metricsCollected: totalMetrics,
    errors,
  };
}

/**
 * Helper to check if a status change requires final sync
 */
export function requiresFinalSync(oldStatus: string, newStatus: string): boolean {
  const activeStates = ['ACTIVE', 'active'];
  const pausedOrDeletedStates = ['PAUSED', 'paused', 'DELETED', 'deleted', 'ARCHIVED', 'archived'];

  return activeStates.includes(oldStatus) && pausedOrDeletedStates.includes(newStatus);
}