# AI Agent - No External APIs Scraping Guide

## Overview

The AI agent now performs **real product discovery and import** without external APIs like Rainforest or Keepa. It uses direct web scraping with retry logic, intelligent GIF generation, and robust price validation.

## Key Features

### ✅ No External APIs
- **Amazon**: BeautifulSoup + regex with 3-5 retries and exponential backoff
- **AliExpress**: Direct search scraping with 100+ sales filter
- **Instagram**: yt-dlp for reel downloads (no API required)

### ✅ Smart GIF Generation
- **Text-free zones**: Crops out top 11% and bottom 11% where IG overlays appear
- **Duration**: 2-5 seconds per GIF
- **Size**: < 20MB using ffmpeg palette optimization
- **Quality**: 15-24 FPS, 1080px base resolution
- **Variants**: 2-3 GIFs per product automatically selected

### ✅ Robust Pricing
- **Amazon**: Prime-only verification with multiple price selector patterns
- **AliExpress**: Minimum 100 orders requirement, includes shipping
- **Pass Rule**: AE ≤ 50% of Amazon OR spread ≥ $20
- **Soft-pass**: Optional for missing prices (admin review)

## Workflow

```
1. Load YAML manifests from /products/*.yml
2. For each product:
   a. Fetch Amazon price (retry with backoff)
   b. Search AliExpress (100+ orders, sort by sales)
   c. Validate pricing rules
   d. Download inspiration reels
   e. Generate 2-3 text-free GIFs
   f. Upload assets to Supabase
   g. UPSERT to products table (status: pending)
3. Generate run_summary.json
4. Callback to Supabase with results
```

## Python Dependencies

Updated `scripts/requirements.txt`:
```
requests==2.32.3
PyYAML==6.0.2
opencv-python-headless==4.10.0.84
imageio==2.35.1
numpy==2.1.1
beautifulsoup4==4.12.3      # NEW: HTML parsing
lxml==5.3.0                  # NEW: Fast XML/HTML parser
yt-dlp==2024.8.6             # NEW: Instagram reel downloader
```

## GitHub Workflow

The workflow (`.github/workflows/import-products.yml`) already installs:
- ✅ ffmpeg (for GIF generation)
- ✅ Python 3.11
- ✅ All dependencies from requirements.txt

No changes needed!

## Environment Variables

### Required
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
REVOA_ADMIN_TOKEN=your_admin_token  # or EMAIL/PASSWORD
```

### Optional (Scraping Configuration)
```bash
SCRAPE_MAX_RETRIES=4           # Number of retry attempts
SCRAPE_SLEEP_BASE=2.0          # Base sleep time (exponential backoff)
REQUESTS_USER_AGENT="Mozilla/5.0 ..."  # Custom UA string
GIF_MAX_MB=20                  # Max GIF file size
GIF_MIN_SEC=3.0                # Min GIF duration
GIF_MAX_SEC=6.0                # Max GIF duration
GIF_TARGET_FPS=24              # Target frames per second
GIF_MIN_FPS=10                 # Minimum FPS (if size too large)
TARGET_NEW_PRODUCTS=5          # Products to import per run
MAX_RUNTIME_MIN=25             # Max runtime in minutes
```

## YAML Manifest Format

Example `/products/home-essentials.yml`:

```yaml
products:
  - external_id: "ig:C-ABC123:door-draft-stopper"
    name: "Under Door Draft Stopper"
    category: "Home"
    description: "Seal drafts, cut noise, save energy."

    # Inspiration reels (will download and generate GIFs)
    inspiration_reels:
      - "https://www.instagram.com/reel/C-ABC123/"
      - "https://www.instagram.com/reel/C-DEF456/"

    # Search terms for discovering more reels (optional)
    reel_search_terms:
      - "under door draft stopper"
      - "door gap blocker"
      - "noise seal door"

    # Amazon product URL (required)
    amazon_url: "https://www.amazon.com/dp/B08XYZ1234"

    # Optional: Price hint if scraping fails
    amazon_price_hint: 29.99

    # Optional: Skip Prime requirement
    prime_required: true  # default: true

    # AliExpress search terms (required)
    aliexpress_search_terms:
      - "under door draft stopper noise seal"
      - "door draft blocker bottom"
      - "door gap sealer strip"

    # Optional: Direct AliExpress candidate URLs
    aliexpress_candidates:
      - "https://www.aliexpress.com/item/1234567890.html"

    # Optional: Supplier fallback price
    supplier_price: 8.50
    use_supplier_price_if_ae_scrape_fails: true

    # Soft-pass options (allow import even if prices missing)
    allow_aliexpress_soft_pass: true
    allow_amazon_soft_pass: true

    # Scraping thresholds
    min_sales: 100    # Minimum AliExpress orders
    top_n: 3          # Top N candidates to check

    # GIF preferences
    gif_aspect: "square"  # or "4x6" for vertical
```

## Amazon Scraping Details

### Price Selectors (BeautifulSoup + Regex)

The scraper tries multiple selectors in order:
1. `.a-offscreen` (most common)
2. `#corePrice_desktop .a-offscreen`
3. `#priceblock_ourprice`
4. `#priceblock_dealprice`
5. `#sns-base-price`
6. `.a-price-whole`
7. JSON embedded data

### Prime Verification

Checks for Prime badge patterns:
- `Prime</span>`
- `aria-label="Prime"`
- `a-icon-prime`
- `amazon-prime-logo`
- SVG prime icons

### Retry Logic

```python
# 3-5 retries with exponential backoff
Attempt 1: Immediate
Attempt 2: 2s delay
Attempt 3: 4s delay
Attempt 4: 8s delay
```

Handles 503 errors and request timeouts gracefully.

## AliExpress Scraping Details

### Search Strategy

1. **Query**: Uses `aliexpress_search_terms` from YAML
2. **Sort**: `SortType=orders_desc` (highest sales first)
3. **Filter**: Only items with ≥`min_sales` orders (default 100)
4. **Verify**: Fetches top 8-12 product pages to confirm price + shipping
5. **Select**: Lowest total price (item + shipping)

### Sales Detection

Multiple patterns to find order counts:
```python
- "(\d+) sold"
- "(\d+) orders"
- 'tradeCount: (\d+)'
- 'totalSales: (\d+)'
```

### Price Parsing

Extracts from:
- JSON `"salePrice"` field
- JSON `"price"` field
- Visible `$XX.XX` patterns
- Shipping from `"shippingFee"` or visible text

## GIF Generation Process

### 1. Download Reel
```bash
yt-dlp -f "best[height<=1080]" \
  --output "/tmp/reel.mp4" \
  "https://www.instagram.com/reel/..."
```

### 2. Detect Clean Windows
- Scans video at 0.15s intervals
- Scores each frame for "textiness" using:
  - MSER (Maximally Stable Extremal Regions)
  - Canny edge detection
  - Connected components
- Selects 2-3 cleanest segments (2-5s each)

### 3. Generate GIF with Safe Margins

**ffmpeg command** (crops out text overlay zones):

```bash
# Square GIF (avoiding text)
ffmpeg -ss {start} -t {duration} -i video.mp4 \
  -vf "crop='min(iw,ih*0.78)':'min(iw,ih*0.78)':('iw-out_w')/2:'ih*0.11', \
       scale=1080:1080:flags=lanczos, \
       fps=18, \
       split[s0][s1]; \
       [s0]palettegen[p]; \
       [s1][p]paletteuse" \
  output.gif
```

**Crop breakdown**:
- Height: `ih*0.78` (78% of original, excluding 22% for text)
- Y-offset: `ih*0.11` (start 11% from top, avoiding top text)
- Result: Middle 78% only = **text-free zone**

### 4. Size Budgeting
- **Target**: 1080px, 24 FPS
- **If too large**: Reduce FPS → 22, 20, 18, ...10
- **If still large**: Reduce resolution → 960, 864, 720, 640
- **Goal**: < 20MB (Shopify limit)

## Pass Rule Logic

```python
def enforce_rule(ae_total, amz_total, min_spread=20.0, soft_pass=False):
    # Both missing → FAIL
    if ae_total is None and amz_total is None:
        return False

    # Soft-pass: Allow missing AE if enabled
    if ae_total is None and soft_pass and amz_total:
        return True, "SOFT-PASS: AE missing, admin review"

    # Hard requirement: Amazon Prime must exist
    if amz_total is None:
        return False, "Amazon (Prime) not found"

    # Pricing rules
    spread = amz_total - ae_total
    half_rule = ae_total <= (amz_total * 0.50)  # AE ≤ 50% of Amazon
    spread_rule = spread >= min_spread           # Spread ≥ $20

    if half_rule or spread_rule:
        return True, f"PASS (AE ${ae_total} vs AMZ ${amz_total}; spread ${spread})"

    return False, f"FAIL (spread only ${spread}, need $20+)"
```

## Output: run_summary.json

Generated after each run:

```json
{
  "total_products": 5,
  "successful": 3,
  "failed": 0,
  "skipped": 2,
  "skipped_details": [
    {
      "external_id": "ig:C-ABC:product",
      "reason": "Amazon (Prime) price not found"
    }
  ],
  "runtime_seconds": 127,
  "timestamp": "2025-10-10T12:34:56Z"
}
```

## Product Metadata

Each imported product includes:

```json
{
  "metadata": {
    "price_rule_pass": true,
    "price_rule_reason": "PASS (AE $8.50 vs AMZ $29.99; spread $21.49)",
    "amazon_url": "https://amazon.com/dp/...",
    "aliexpress_url": "https://aliexpress.com/item/...",
    "amz_total": 29.99,
    "ae_total": 8.50,
    "notes": "GIFs auto-generated: text-free segments; ≤20MB; square",
    "admin_review_required": false,  // true if soft-pass
    "copy": {
      "titles": [...],
      "descriptions": [...],
      "headlines": [...]
    }
  }
}
```

## Troubleshooting

### Amazon: "Price not found"
- Check if product page loaded (503, bot detection)
- Try manual fetch: `curl -A "Mozilla..." URL`
- Add `amazon_price_hint` to YAML as fallback
- Verify Prime badge is visible on product page

### AliExpress: "No items with ≥100 orders"
- Try broader search terms in `aliexpress_search_terms`
- Lower `min_sales` to 50 or 20 temporarily
- Check if AliExpress changed their HTML structure
- Add direct URLs to `aliexpress_candidates`

### GIF: "No sufficiently clean windows"
- Reel may have persistent text overlays
- Safe margins (11% top/bottom) might be insufficient
- Try different reels from `inspiration_reels`
- Or manually create GIFs and place in assets folder

### Workflow: "Run failed"
- Check GitHub Actions logs for Python traceback
- Verify Supabase secrets are set (URL, ANON_KEY, ADMIN_TOKEN)
- Ensure `products/*.yml` files exist and are valid YAML
- Check for network issues or rate limiting

## Testing Locally

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your_key"
export REVOA_ADMIN_TOKEN="your_token"

# Install dependencies
pip install -r scripts/requirements.txt

# Run import
python3 scripts/revoa_import.py

# Check output
cat run_summary.json
```

## Cost Analysis

**Before (with APIs)**:
- Keepa: $0.01/request × 100 products = $1.00
- Rainforest: $0.005/request × 100 products = $0.50
- **Total**: ~$1.50 per 100 products

**After (scraping only)**:
- Scraping: FREE
- Server time: ~$0.001 per GitHub Actions minute
- **Total**: ~$0.01-0.02 per 100 products

**Savings**: 98% reduction in cost! 🎉

## Next Steps

1. ✅ Dependencies installed
2. ✅ Scraping logic implemented
3. ✅ GIF generation with text-free zones
4. ✅ Workflow configured
5. 🔄 **Test with real YAML**: Add products to `/products/*.yml`
6. 🔄 **Run workflow**: Trigger via GitHub Actions or schedule
7. 🔄 **Review in admin**: Check `/admin/product-approvals`

## Pro Tips

- **Start small**: Test with 1-2 products first
- **Use good search terms**: Specific + generic mix
- **Check reel quality**: High-resolution reels = better GIFs
- **Monitor logs**: GitHub Actions logs show detailed progress
- **Soft-pass enabled**: Products import even if prices missing (admin review)
- **Iterate**: Adjust search terms based on what works
