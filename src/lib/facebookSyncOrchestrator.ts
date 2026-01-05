import { supabase } from './supabase';
import { format, subDays } from 'date-fns';

export interface SyncJob {
  id: string;
  user_id: string;
  ad_account_id: string;
  sync_phase: 'recent_90_days' | 'historical_backfill';
  sync_type: 'initial' | 'incremental' | 'manual';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  total_chunks: number;
  completed_chunks: number;
  failed_chunks: number;
  phase_1_completed_at: string | null;
  phase_2_completed_at: string | null;
  current_chunk_type: string | null;
  total_campaigns_synced: number;
  total_adsets_synced: number;
  total_ads_synced: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncJobChunk {
  id: string;
  sync_job_id: string;
  chunk_type: 'structure' | 'campaign_metrics' | 'adset_metrics' | 'ad_metrics';
  chunk_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  entity_offset: number;
  entity_limit: number;
  start_date: string | null;
  end_date: string | null;
  entities_processed: number;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
}

interface CreateSyncJobParams {
  userId: string;
  adAccountId: string;
  syncPhase: 'recent_90_days' | 'historical_backfill';
  syncType: 'initial' | 'incremental' | 'manual';
  accountCreationDate?: Date;
}

export class FacebookSyncOrchestrator {
  private static readonly CAMPAIGN_BATCH_SIZE = 50;
  private static readonly ADSET_BATCH_SIZE = 50;
  private static readonly AD_BATCH_SIZE = 100;
  private static readonly CHUNK_DELAY_MS = 2000; // 2 second delay between chunks
  private static readonly RECENT_DAYS = 90;

  /**
   * Start Phase 1: Recent 90 days sync
   */
  static async startPhase1Sync(params: CreateSyncJobParams): Promise<string> {
    const { userId, adAccountId, syncType } = params;

    // Calculate date range for recent 90 days
    const endDate = new Date();
    const startDate = subDays(endDate, this.RECENT_DAYS);

    // Get entity counts
    const entityCounts = await this.getEntityCounts(adAccountId);

    // Create sync job
    const { data: syncJob, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        user_id: userId,
        ad_account_id: adAccountId,
        sync_phase: 'recent_90_days',
        sync_type: syncType,
        status: 'pending',
        recent_start_date: format(startDate, 'yyyy-MM-dd'),
        recent_end_date: format(endDate, 'yyyy-MM-dd'),
      })
      .select()
      .single();

    if (jobError || !syncJob) {
      throw new Error(`Failed to create sync job: ${jobError?.message}`);
    }

    // Create chunks for Phase 1
    await this.createPhase1Chunks(syncJob.id, startDate, endDate, entityCounts);

    // Start executing chunks
    this.executeChunksInBackground(syncJob.id);

    return syncJob.id;
  }

  /**
   * Start Phase 2: Historical backfill
   */
  static async startPhase2Sync(params: CreateSyncJobParams): Promise<string> {
    const { userId, adAccountId, syncType, accountCreationDate } = params;

    if (!accountCreationDate) {
      throw new Error('Account creation date required for historical backfill');
    }

    // Get Phase 1 end date
    const { data: phase1Job } = await supabase
      .from('sync_jobs')
      .select('recent_start_date')
      .eq('ad_account_id', adAccountId)
      .eq('sync_phase', 'recent_90_days')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (!phase1Job?.recent_start_date) {
      throw new Error('Phase 1 must be completed before starting Phase 2');
    }

    // Historical range: account creation to (90 days ago - 1 day)
    const startDate = accountCreationDate;
    const endDate = subDays(new Date(phase1Job.recent_start_date), 1);

    // Get entity counts
    const entityCounts = await this.getEntityCounts(adAccountId);

    // Create sync job
    const { data: syncJob, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        user_id: userId,
        ad_account_id: adAccountId,
        sync_phase: 'historical_backfill',
        sync_type: syncType,
        status: 'pending',
        historical_start_date: format(startDate, 'yyyy-MM-dd'),
        historical_end_date: format(endDate, 'yyyy-MM-dd'),
      })
      .select()
      .single();

    if (jobError || !syncJob) {
      throw new Error(`Failed to create sync job: ${jobError?.message}`);
    }

    // Create chunks for Phase 2 (break into 90-day periods)
    await this.createPhase2Chunks(syncJob.id, startDate, endDate, entityCounts);

    // Start executing chunks in background
    this.executeChunksInBackground(syncJob.id);

    return syncJob.id;
  }

  /**
   * Run incremental sync (daily updates)
   */
  static async runIncrementalSync(userId: string, adAccountId: string): Promise<string> {
    // Get last sync date
    const { data: adAccount } = await supabase
      .from('ad_accounts')
      .select('last_synced_at')
      .eq('id', adAccountId)
      .single();

    const lastSyncDate = adAccount?.last_synced_at
      ? new Date(adAccount.last_synced_at)
      : subDays(new Date(), 1);

    const endDate = new Date();

    // Get entity counts
    const entityCounts = await this.getEntityCounts(adAccountId);

    // Create incremental sync job
    const { data: syncJob, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        user_id: userId,
        ad_account_id: adAccountId,
        sync_phase: 'recent_90_days',
        sync_type: 'incremental',
        status: 'pending',
        recent_start_date: format(lastSyncDate, 'yyyy-MM-dd'),
        recent_end_date: format(endDate, 'yyyy-MM-dd'),
      })
      .select()
      .single();

    if (jobError || !syncJob) {
      throw new Error(`Failed to create sync job: ${jobError?.message}`);
    }

    // Create chunks (simpler for incremental - just metrics)
    await this.createIncrementalChunks(syncJob.id, lastSyncDate, endDate, entityCounts);

    // Execute immediately
    this.executeChunksInBackground(syncJob.id);

    return syncJob.id;
  }

  /**
   * Get entity counts for an ad account
   */
  private static async getEntityCounts(adAccountId: string) {
    const [campaignsResult, adsetsResult, adsResult] = await Promise.all([
      supabase
        .from('ad_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('ad_account_id', adAccountId),
      supabase
        .from('ad_sets')
        .select('id', { count: 'exact', head: true })
        .eq('ad_account_id', adAccountId),
      supabase
        .from('ads')
        .select('id', { count: 'exact', head: true })
        .eq('ad_account_id', adAccountId),
    ]);

    return {
      campaigns: campaignsResult.count || 0,
      adsets: adsetsResult.count || 0,
      ads: adsResult.count || 0,
    };
  }

  /**
   * Create chunks for Phase 1 (recent 90 days)
   */
  private static async createPhase1Chunks(
    syncJobId: string,
    startDate: Date,
    endDate: Date,
    entityCounts: { campaigns: number; adsets: number; ads: number }
  ) {
    const chunks: any[] = [];
    let chunkOrder = 0;

    // Chunk 1: Structure discovery (no metrics yet)
    chunks.push({
      sync_job_id: syncJobId,
      chunk_type: 'structure',
      chunk_order: chunkOrder++,
      status: 'pending',
      entity_offset: 0,
      entity_limit: 0, // Fetch all
      estimated_duration_seconds: 120, // 2 minutes
    });

    // Campaign metrics chunks
    const campaignBatches = Math.ceil(entityCounts.campaigns / this.CAMPAIGN_BATCH_SIZE);
    for (let i = 0; i < campaignBatches; i++) {
      chunks.push({
        sync_job_id: syncJobId,
        chunk_type: 'campaign_metrics',
        chunk_order: chunkOrder++,
        status: 'pending',
        entity_offset: i * this.CAMPAIGN_BATCH_SIZE,
        entity_limit: this.CAMPAIGN_BATCH_SIZE,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        estimated_duration_seconds: 60,
      });
    }

    // Ad set metrics chunks
    const adsetBatches = Math.ceil(entityCounts.adsets / this.ADSET_BATCH_SIZE);
    for (let i = 0; i < adsetBatches; i++) {
      chunks.push({
        sync_job_id: syncJobId,
        chunk_type: 'adset_metrics',
        chunk_order: chunkOrder++,
        status: 'pending',
        entity_offset: i * this.ADSET_BATCH_SIZE,
        entity_limit: this.ADSET_BATCH_SIZE,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        estimated_duration_seconds: 45,
      });
    }

    // Ad metrics chunks
    const adBatches = Math.ceil(entityCounts.ads / this.AD_BATCH_SIZE);
    for (let i = 0; i < adBatches; i++) {
      chunks.push({
        sync_job_id: syncJobId,
        chunk_type: 'ad_metrics',
        chunk_order: chunkOrder++,
        status: 'pending',
        entity_offset: i * this.AD_BATCH_SIZE,
        entity_limit: this.AD_BATCH_SIZE,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        estimated_duration_seconds: 30,
      });
    }

    // Insert all chunks
    const { error } = await supabase.from('sync_job_chunks').insert(chunks);
    if (error) {
      throw new Error(`Failed to create chunks: ${error.message}`);
    }

    // Update total chunks count
    await supabase
      .from('sync_jobs')
      .update({ total_chunks: chunks.length })
      .eq('id', syncJobId);
  }

  /**
   * Create chunks for Phase 2 (historical backfill in 90-day periods)
   */
  private static async createPhase2Chunks(
    syncJobId: string,
    startDate: Date,
    endDate: Date,
    entityCounts: { campaigns: number; adsets: number; ads: number }
  ) {
    const chunks: any[] = [];
    let chunkOrder = 0;

    // Break historical range into 90-day periods
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const periodCount = Math.ceil(totalDays / this.RECENT_DAYS);

    for (let period = 0; period < periodCount; period++) {
      const periodStart = new Date(startDate);
      periodStart.setDate(periodStart.getDate() + (period * this.RECENT_DAYS));

      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + this.RECENT_DAYS - 1);

      // Don't exceed historical end date
      if (periodEnd > endDate) {
        periodEnd.setTime(endDate.getTime());
      }

      // Campaign metrics for this period
      const campaignBatches = Math.ceil(entityCounts.campaigns / this.CAMPAIGN_BATCH_SIZE);
      for (let i = 0; i < campaignBatches; i++) {
        chunks.push({
          sync_job_id: syncJobId,
          chunk_type: 'campaign_metrics',
          chunk_order: chunkOrder++,
          status: 'pending',
          entity_offset: i * this.CAMPAIGN_BATCH_SIZE,
          entity_limit: this.CAMPAIGN_BATCH_SIZE,
          start_date: format(periodStart, 'yyyy-MM-dd'),
          end_date: format(periodEnd, 'yyyy-MM-dd'),
          estimated_duration_seconds: 60,
        });
      }

      // Ad set metrics for this period
      const adsetBatches = Math.ceil(entityCounts.adsets / this.ADSET_BATCH_SIZE);
      for (let i = 0; i < adsetBatches; i++) {
        chunks.push({
          sync_job_id: syncJobId,
          chunk_type: 'adset_metrics',
          chunk_order: chunkOrder++,
          status: 'pending',
          entity_offset: i * this.ADSET_BATCH_SIZE,
          entity_limit: this.ADSET_BATCH_SIZE,
          start_date: format(periodStart, 'yyyy-MM-dd'),
          end_date: format(periodEnd, 'yyyy-MM-dd'),
          estimated_duration_seconds: 45,
        });
      }

      // Ad metrics for this period
      const adBatches = Math.ceil(entityCounts.ads / this.AD_BATCH_SIZE);
      for (let i = 0; i < adBatches; i++) {
        chunks.push({
          sync_job_id: syncJobId,
          chunk_type: 'ad_metrics',
          chunk_order: chunkOrder++,
          status: 'pending',
          entity_offset: i * this.AD_BATCH_SIZE,
          entity_limit: this.AD_BATCH_SIZE,
          start_date: format(periodStart, 'yyyy-MM-dd'),
          end_date: format(periodEnd, 'yyyy-MM-dd'),
          estimated_duration_seconds: 30,
        });
      }
    }

    // Insert all chunks
    const { error } = await supabase.from('sync_job_chunks').insert(chunks);
    if (error) {
      throw new Error(`Failed to create chunks: ${error.message}`);
    }

    // Update total chunks count
    await supabase
      .from('sync_jobs')
      .update({ total_chunks: chunks.length })
      .eq('id', syncJobId);
  }

  /**
   * Create chunks for incremental sync
   */
  private static async createIncrementalChunks(
    syncJobId: string,
    startDate: Date,
    endDate: Date,
    entityCounts: { campaigns: number; adsets: number; ads: number }
  ) {
    const chunks: any[] = [];
    let chunkOrder = 0;

    // For incremental sync, just fetch metrics (structure already exists)

    // Campaign metrics
    const campaignBatches = Math.ceil(entityCounts.campaigns / this.CAMPAIGN_BATCH_SIZE);
    for (let i = 0; i < campaignBatches; i++) {
      chunks.push({
        sync_job_id: syncJobId,
        chunk_type: 'campaign_metrics',
        chunk_order: chunkOrder++,
        status: 'pending',
        entity_offset: i * this.CAMPAIGN_BATCH_SIZE,
        entity_limit: this.CAMPAIGN_BATCH_SIZE,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        estimated_duration_seconds: 30,
      });
    }

    // Ad set metrics
    const adsetBatches = Math.ceil(entityCounts.adsets / this.ADSET_BATCH_SIZE);
    for (let i = 0; i < adsetBatches; i++) {
      chunks.push({
        sync_job_id: syncJobId,
        chunk_type: 'adset_metrics',
        chunk_order: chunkOrder++,
        status: 'pending',
        entity_offset: i * this.ADSET_BATCH_SIZE,
        entity_limit: this.ADSET_BATCH_SIZE,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        estimated_duration_seconds: 30,
      });
    }

    // Ad metrics
    const adBatches = Math.ceil(entityCounts.ads / this.AD_BATCH_SIZE);
    for (let i = 0; i < adBatches; i++) {
      chunks.push({
        sync_job_id: syncJobId,
        chunk_type: 'ad_metrics',
        chunk_order: chunkOrder++,
        status: 'pending',
        entity_offset: i * this.AD_BATCH_SIZE,
        entity_limit: this.AD_BATCH_SIZE,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        estimated_duration_seconds: 20,
      });
    }

    // Insert all chunks
    const { error } = await supabase.from('sync_job_chunks').insert(chunks);
    if (error) {
      throw new Error(`Failed to create chunks: ${error.message}`);
    }

    // Update total chunks count
    await supabase
      .from('sync_jobs')
      .update({ total_chunks: chunks.length })
      .eq('id', syncJobId);
  }

  /**
   * Execute chunks in sequence with retry logic
   */
  private static async executeChunksInBackground(syncJobId: string) {
    try {
      // Mark job as in progress
      await supabase
        .from('sync_jobs')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', syncJobId);

      // Get all pending chunks in order
      const { data: chunks } = await supabase
        .from('sync_job_chunks')
        .select('*')
        .eq('sync_job_id', syncJobId)
        .order('chunk_order', { ascending: true });

      if (!chunks || chunks.length === 0) {
        throw new Error('No chunks found for sync job');
      }

      // Get sync job details
      const { data: syncJob } = await supabase
        .from('sync_jobs')
        .select('*, ad_accounts!inner(platform_account_id)')
        .eq('id', syncJobId)
        .single();

      if (!syncJob) {
        throw new Error('Sync job not found');
      }

      const adAccountId = syncJob.ad_accounts.platform_account_id;

      // Execute each chunk
      for (const chunk of chunks) {
        if (chunk.status === 'completed' || chunk.status === 'skipped') {
          continue;
        }

        await this.executeChunk(syncJobId, chunk, adAccountId);

        // Small delay between chunks to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, this.CHUNK_DELAY_MS));
      }

      // Mark job as completed
      const completionField = syncJob.sync_phase === 'recent_90_days'
        ? 'phase_1_completed_at'
        : 'phase_2_completed_at';

      await supabase
        .from('sync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          [completionField]: new Date().toISOString(),
        })
        .eq('id', syncJobId);

      // Update ad account last_synced_at
      await supabase
        .from('ad_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', syncJob.ad_account_id);

      // If Phase 1 completed, auto-start Phase 2
      if (syncJob.sync_phase === 'recent_90_days') {
        // Get account creation date (we'll need to add this to ad_accounts table)
        // For now, assume 2 years ago as default
        const accountCreationDate = new Date();
        accountCreationDate.setFullYear(accountCreationDate.getFullYear() - 2);

        // Start Phase 2 in background
        setTimeout(() => {
          this.startPhase2Sync({
            userId: syncJob.user_id,
            adAccountId: syncJob.ad_account_id,
            syncType: 'initial',
            accountCreationDate,
          }).catch(console.error);
        }, 5000); // 5 second delay before starting Phase 2
      }

    } catch (error) {
      console.error('Sync job failed:', error);

      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncJobId);
    }
  }

  /**
   * Execute a single chunk with retry logic
   */
  private static async executeChunk(
    syncJobId: string,
    chunk: SyncJobChunk,
    adAccountId: string
  ) {
    const maxRetries = chunk.max_retries;
    let retryCount = chunk.retry_count;

    while (retryCount <= maxRetries) {
      try {
        // Mark chunk as in progress
        await supabase
          .from('sync_job_chunks')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
            retry_count: retryCount,
          })
          .eq('id', chunk.id);

        // Update sync job current chunk type
        await supabase
          .from('sync_jobs')
          .update({
            current_chunk_type: chunk.chunk_type,
            current_entity_offset: chunk.entity_offset,
          })
          .eq('id', syncJobId);

        const startTime = Date.now();

        // Call chunked Edge Function with chunk parameters
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-ads-sync-chunk`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              adAccountId,
              chunkType: chunk.chunk_type,
              entityOffset: chunk.entity_offset,
              entityLimit: chunk.entity_limit,
              startDate: chunk.start_date,
              endDate: chunk.end_date,
              jobId: syncJobId,
              chunkId: chunk.id,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Sync failed: ${errorText}`);
        }

        const result = await response.json();

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        // Mark chunk as completed
        await supabase
          .from('sync_job_chunks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            actual_duration_seconds: durationSeconds,
            entities_processed: result.entitiesProcessed || 0,
            metrics_synced: result.metricsSynced || 0,
          })
          .eq('id', chunk.id);

        // Success - break retry loop
        break;

      } catch (error) {
        retryCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (retryCount > maxRetries) {
          // Max retries exceeded - mark as failed
          await supabase
            .from('sync_job_chunks')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              retry_count: retryCount,
              last_error: errorMessage,
            })
            .eq('id', chunk.id);

          console.error(`Chunk ${chunk.id} failed after ${maxRetries} retries:`, errorMessage);
          break;
        } else {
          // Retry with exponential backoff
          const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`Chunk ${chunk.id} failed, retrying in ${backoffMs}ms (attempt ${retryCount}/${maxRetries})`);

          await supabase
            .from('sync_job_chunks')
            .update({
              retry_count: retryCount,
              last_error: errorMessage,
            })
            .eq('id', chunk.id);

          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  /**
   * Get sync job status
   */
  static async getSyncJobStatus(syncJobId: string): Promise<SyncJob | null> {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('id', syncJobId)
      .single();

    if (error) {
      console.error('Error fetching sync job:', error);
      return null;
    }

    return data;
  }

  /**
   * Get active sync job for an ad account
   */
  static async getActiveSyncJob(adAccountId: string): Promise<SyncJob | null> {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('ad_account_id', adAccountId)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active sync job:', error);
      return null;
    }

    return data;
  }

  /**
   * Cancel a running sync job
   */
  static async cancelSyncJob(syncJobId: string): Promise<void> {
    await supabase
      .from('sync_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncJobId);

    // Cancel all pending chunks
    await supabase
      .from('sync_job_chunks')
      .update({ status: 'skipped' })
      .eq('sync_job_id', syncJobId)
      .eq('status', 'pending');
  }
}
