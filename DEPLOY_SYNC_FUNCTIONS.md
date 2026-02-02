# Deploy Sync Functions - Quick Fix for "Failed to fetch"

## Issue

You're seeing "Failed to fetch" when trying to sync Facebook Ads because the new `facebook-ads-sync-chunk` Edge Function hasn't been deployed to your Supabase project yet.

## Quick Fix (Deploy the Edge Function)

### Option 1: Deploy via Supabase CLI (Recommended)

```bash
# 1. Make sure you're logged in to Supabase CLI
supabase login

# 2. Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# 3. Deploy the new Edge Function
supabase functions deploy facebook-ads-sync-chunk
```

### Option 2: Deploy via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Deploy a new function**
4. Upload the file from `supabase/functions/facebook-ads-sync-chunk/index.ts`
5. Name it `facebook-ads-sync-chunk`
6. Click **Deploy**

### Option 3: Temporary Fallback (Use Old Sync Method)

If you can't deploy the Edge Function right now, you can temporarily use the old sync method:

In `src/components/onboarding/AdPlatformIntegration.tsx`, replace the sync code with:

```typescript
// Around line 166, replace this:
const syncJobId = await FacebookSyncOrchestrator.startPhase1Sync({
  userId: user.id,
  adAccountId: account.id,
  syncType: 'initial',
});

// With this:
await facebookAdsService.syncAdAccount(account.platform_account_id);
toast.success('Sync complete!');
return; // Skip the modal
```

## Verify Deployment

After deploying, verify the function is working:

```bash
# Test the function
curl -X POST \
  "https://your-project-ref.supabase.co/functions/v1/facebook-ads-sync-chunk" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "adAccountId": "act_123456789",
    "chunkType": "structure",
    "entityOffset": 0,
    "entityLimit": 50
  }'
```

You should get a 200 response (or 401 if you need valid auth).

## What This Function Does

The `facebook-ads-sync-chunk` function:
- Accepts a chunk of work (e.g., "sync 50 campaigns")
- Executes just that chunk
- Returns in under 2 minutes
- Enables the two-phase sync system

## Need Help?

If you're still seeing errors after deployment:
1. Check the Supabase Edge Functions logs
2. Verify your environment variables are set
3. Check the browser console for detailed error messages
4. Ensure your Supabase project has the correct CORS settings

## Alternative: Full Redeployment

If you want to deploy all functions at once:

```bash
# Deploy all Edge Functions
supabase functions deploy
```

This will deploy:
- `facebook-ads-sync` (legacy, still used for manual syncs)
- `facebook-ads-sync-chunk` (new chunked system)
- All other existing Edge Functions
