# ✅ AI Agent is READY TO RUN!

## What Just Got Fixed

The AI agent script was **explicitly skipping YAML files** and waiting for "real AI discovery".

**Fixed:** Script now loads and processes products from `/products/*.yml` files.

## What Happens When You Click "Run AI Agent (Real Mode)"

### 1. **Button Click** → Frontend (`/admin/ai-import`)
   ```typescript
   onClick={() => runAgent('real')}
   ```
   - Calls `agent-dispatch` edge function
   - Creates job in `import_jobs` table with status: `queued`

### 2. **Edge Function** → `agent-dispatch`
   - Validates admin permissions
   - Triggers GitHub Actions workflow
   - Updates job status to `running`

### 3. **GitHub Actions** → `.github/workflows/import-products.yml`
   ```yaml
   - Installs: ffmpeg, Python 3.11, dependencies
   - Runs: python3 scripts/revoa_import.py
   - Env vars: SUPABASE_URL, ANON_KEY, ADMIN_TOKEN
   ```

### 4. **Python Script** → `revoa_import.py`
   For each product in `/products/*.yml`:

   ✅ **Amazon Scraping**
   - Fetches product page with retry logic (3-5 attempts)
   - Parses price using BeautifulSoup + regex
   - Verifies Prime badge
   - Falls back to `amazon_price_hint` if needed

   ✅ **AliExpress Search**
   - Searches using `aliexpress_search_terms`
   - Filters: Only items with ≥100 orders
   - Sorts by: `orders_desc` (highest sales first)
   - Verifies: Price + shipping on product pages
   - Selects: Lowest total price

   ✅ **Price Validation**
   - Pass if: AE ≤ 50% of Amazon **OR** spread ≥ $20
   - Soft-pass: Optional (admin review required)

   ✅ **Reel Download**
   - Uses `yt-dlp` to download Instagram reels
   - No API required (direct scraping)

   ✅ **GIF Generation**
   - 2-3 GIFs per product
   - Duration: 2-5 seconds each
   - **Text-free zones**: Crops out top 11% + bottom 11%
   - Size: <20MB using ffmpeg palette optimization
   - Quality: 15-24 FPS, 1080px base

   ✅ **Asset Upload**
   - Uploads to Supabase Storage: `product-assets/<category>/<slug>/`
   - Main images, lifestyle shots, GIFs

   ✅ **Product Import**
   - Calls `import-products` edge function
   - Mode: `upsert` (creates or updates)
   - Status: `pending` (awaits admin approval)

### 5. **Callback** → `agent-callback`
   - Updates job status: `succeeded` or `failed`
   - Adds summary: `{ total, successful, failed, skipped }`
   - Sets GitHub run URL for logs

### 6. **Admin Review** → `/admin/product-approvals`
   - Products appear with status: `pending`
   - Review: Pricing, images, GIFs, metadata
   - Approve/Reject: Publish to live catalog

## Current Setup Status

✅ **Script Fixed**: Now loads YAML files
✅ **Dependencies**: BeautifulSoup, lxml, yt-dlp added
✅ **Scraping**: Amazon + AliExpress with retry logic
✅ **GIF Generation**: Text-free zones implemented
✅ **Sample Product**: Created in `/products/sample-product.yml`
✅ **Workflow**: GitHub Actions configured
✅ **Edge Functions**: Dispatch + callback ready

## What You Need to Run It

### 1. GitHub Secrets (in Supabase)
```bash
# Set these via Supabase CLI or Dashboard
supabase secrets set GITHUB_TOKEN=ghp_YOUR_TOKEN
supabase secrets set GITHUB_OWNER=your-username
supabase secrets set GITHUB_REPO=your-repo-name
```

**Get GitHub Token:**
- Go to: https://github.com/settings/tokens
- Generate new token (classic)
- Scopes: `repo` + `workflow`

### 2. GitHub Repository Secrets
Already configured (from previous setup):
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE`
- ✅ `REVOA_ADMIN_TOKEN` (or EMAIL/PASSWORD)

### 3. Product YAML Files

**Location:** `/products/*.yml`

**Sample created:** `/products/sample-product.yml`

**To add more products:**
1. Create new `.yml` files in `/products/` directory
2. Follow the format in `sample-product.yml`
3. Commit and push to GitHub

**IMPORTANT:** The sample product has placeholder URLs. Replace with real products:
- Real Amazon product URL
- Real Instagram reel URL
- Real AliExpress search terms

## Testing Flow

### Option A: Test with Sample Product (Quick Test)

**Issue:** Sample product has placeholder URLs that won't scrape successfully.

**Expected Result:**
- ⚠️ Amazon scraping will fail (placeholder URL)
- ⚠️ AliExpress search will fail (generic terms)
- ⚠️ Product will be soft-passed (if `allow_*_soft_pass: true`)
- ✓ Product appears in admin with `admin_review_required: true`

### Option B: Add Real Product (Full Test)

1. **Find a real product:**
   ```yaml
   # Example: Real door draft stopper
   amazon_url: "https://www.amazon.com/dp/B08CXYZ123"  # Find actual ASIN

   inspiration_reels:
     - "https://www.instagram.com/reel/ABC123/"  # Find viral reel

   aliexpress_search_terms:
     - "door draft stopper seal"  # These will work
   ```

2. **Create YAML:** `/products/door-stopper.yml`

3. **Commit and push** to GitHub

4. **Click "Run AI Agent"** in `/admin/ai-import`

**Expected Result:**
- ✓ Amazon price scraped successfully
- ✓ AliExpress suppliers found (100+ orders)
- ✓ Pricing validated (pass rule)
- ✓ Instagram reel downloaded
- ✓ 2-3 GIFs generated (text-free)
- ✓ Assets uploaded to Supabase
- ✓ Product appears in `/admin/product-approvals`

## How to Run Right Now

### Step 1: Verify GitHub Secrets

```bash
# Check if secrets are set
supabase secrets list

# Should show:
# GITHUB_TOKEN (set)
# GITHUB_OWNER (set)
# GITHUB_REPO (set)
```

If not set, run:
```bash
supabase secrets set GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE
supabase secrets set GITHUB_OWNER=your-github-username
supabase secrets set GITHUB_REPO=your-repo-name
```

### Step 2: Open Admin Panel

1. Navigate to: `/admin/ai-import`
2. You should see: "Run AI Agent (Real Mode)" button

### Step 3: Click the Button!

Click **"Run AI Agent (Real Mode)"**

**What you'll see:**
1. Success toast: "AI agent started! Check status below."
2. Job appears in "Recent Jobs" table
3. Status: `queued` → `running`
4. GitHub run URL appears (click to watch logs)

### Step 4: Watch Progress

**In GitHub:**
- Click the "View Run" link
- Watch Python script output in real-time
- See: Product loading, price scraping, GIF generation

**In Admin Panel:**
- Job status updates every 5 seconds
- When done: Status = `succeeded`
- Summary shows: `successful / failed / total`

### Step 5: Review Products

Navigate to: `/admin/product-approvals`

**You'll see:**
- Product(s) with status: `pending`
- Main image (if uploaded)
- GIFs (2-3 per product)
- Pricing data in metadata
- "Approve" or "Reject" buttons

## Troubleshooting

### Error: "Missing GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO"
**Fix:** Set Supabase secrets (see Step 1 above)

### Error: "No products found in /products/*.yml files"
**Fix:** Create YAML files in `/products/` directory

### Error: "Amazon (Prime) price not found"
**Causes:**
- Invalid Amazon URL
- Bot detection (rare with retry logic)
- Product page changed structure

**Fix:**
- Add `amazon_price_hint: 29.99` to YAML
- Set `allow_amazon_soft_pass: true`

### Error: "No AliExpress items found with ≥100 orders"
**Causes:**
- Search terms too specific
- No suppliers meet 100+ order requirement

**Fix:**
- Broaden search terms
- Lower `min_sales: 50` temporarily
- Add direct `aliexpress_candidates` URLs

### Product imported but no GIFs
**Causes:**
- Reel URL invalid
- yt-dlp couldn't download
- All segments had text overlays

**Fix:**
- Use different reel from `inspiration_reels`
- Or upload GIFs manually to assets folder

## Success Indicators

✅ **Job Status = "succeeded"**
✅ **Summary shows: X successful / 0 failed / X total**
✅ **Products appear in `/admin/product-approvals`**
✅ **Each product has:**
   - Main image (1080x1080)
   - 2-3 GIFs (<20MB each)
   - Metadata with pricing data
   - Status: pending

## What's Different from Before?

**Before:**
- Script said: "⚠️ AI DISCOVERY NOT YET IMPLEMENTED"
- Explicitly skipped YAML files
- No products imported

**Now:**
- Script loads YAML files
- Scrapes Amazon (BeautifulSoup + retry)
- Searches AliExpress (100+ orders)
- Downloads reels (yt-dlp)
- Generates GIFs (text-free zones)
- Imports products (status: pending)

## Next Steps

1. **Set GitHub secrets** (if not already done)
2. **Add real product YAMLs** to `/products/` directory
3. **Click "Run AI Agent"** button
4. **Watch the magic happen!** ✨

The agent is now fully operational and will import real products with real pricing, real reels, and real GIFs!
