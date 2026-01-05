# Deploy Edge Function - 3 Quick Options

## ⚡ Option 1: Run the Deployment Script (Fastest)

```bash
# 1. Login to Supabase CLI
npx supabase login

# 2. Run the deployment script
./deploy-sync-chunk.sh
```

That's it! The function will be deployed in ~30 seconds.

---

## 🌐 Option 2: Deploy via Supabase Dashboard (No CLI needed)

1. **Get your function code:**
   - Open `supabase/functions/facebook-ads-sync-chunk/index.ts`
   - Copy all the code (Ctrl+A, Ctrl+C)

2. **Go to Supabase Dashboard:**
   - Visit https://supabase.com/dashboard
   - Select your project: `iipaykvimkbbnoobstpzz`
   - Click **Edge Functions** in left sidebar

3. **Deploy the function:**
   - Click **"Deploy a new function"** or **"New Function"**
   - Name: `facebook-ads-sync-chunk`
   - Paste the code you copied
   - Click **Deploy**

Done! The function is now live.

---

## 🔧 Option 3: Manual CLI Commands

```bash
# 1. Login (one-time setup)
npx supabase login

# 2. Deploy the specific function
npx supabase functions deploy facebook-ads-sync-chunk

# Or deploy all functions at once
npx supabase functions deploy
```

---

## ✅ Verify Deployment

After deploying, refresh your app and try syncing again. You should see:
- A progress modal showing "Phase 1: Setting up sync..."
- Background sync indicator in top-right
- No more "Failed to fetch" errors

---

## 🔑 Getting Your Supabase Access Token (for CLI)

If `npx supabase login` opens a browser, just follow the prompts.

If you need a token manually:
1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Copy the token
4. Run: `export SUPABASE_ACCESS_TOKEN=your_token_here`
5. Then run: `./deploy-sync-chunk.sh`

---

## 🚨 Still Having Issues?

Check the browser console (F12) for detailed error messages. The improved error handling will now show exactly what's wrong.

**Common issues:**
- **"Not authenticated"**: Run `npx supabase login`
- **"Project not found"**: Make sure you're in the project directory
- **"Function already exists"**: That's okay! It will update the existing function

---

## 📋 What Gets Deployed

The `facebook-ads-sync-chunk` function:
- File: `supabase/functions/facebook-ads-sync-chunk/index.ts`
- Size: ~20 KB
- Purpose: Handle chunked Facebook Ads data syncing
- Dependencies: None (uses built-in Deno APIs)

This is the only function you need to deploy to fix the "Failed to fetch" error.
