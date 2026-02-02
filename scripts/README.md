# Revoa AI Agent Import Script

Price-first product import workflow with **automated GIF creation** from video reels.

## Features

- ✅ **Price Validation**: Amazon Prime vs AliExpress (top 3, with shipping + min sales)
- ✅ **Auto-GIF Generation**: Downloads reels, finds text-free 3-6s segments, creates GIFs ≤20MB
- ✅ **Smart Cropping**: Square (1080x1080) or 4x6 tall (1080x1620) with center crop
- ✅ **Size Budgeting**: Targets 24fps, reduces to 10fps if needed, then reduces resolution
- ✅ **Copy Generation**: Auto-creates titles, descriptions, ad variants
- ✅ **UPSERT Mode**: Updates existing products without duplicates

## Quick Start

### 1. Install Dependencies

**System requirements:**
```bash
# Install ffmpeg and yt-dlp
sudo apt-get install ffmpeg
pip install yt-dlp
```

**Python libraries:**
```bash
pip install requests pyyaml opencv-python-headless numpy
```

### 2. Set Environment Variables

In your Bolt project settings (Project Settings → Environment), add:

```
SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
SUPABASE_ANON_KEY=your_anon_key
REVOA_ADMIN_EMAIL=your_admin_email
REVOA_ADMIN_PASSWORD=your_admin_password
```

Or use a token:
```
REVOA_ADMIN_TOKEN=your_admin_token
```

**Optional GIF tuning variables:**
```
GIF_MAX_MB=20              # Max file size (Shopify limit)
GIF_MIN_SEC=3.0            # Minimum clip duration
GIF_MAX_SEC=6.0            # Maximum clip duration
GIF_TARGET_FPS=24          # Target framerate (budgets down if needed)
GIF_MIN_FPS=10             # Minimum framerate before reducing resolution
GIF_ASPECT=square          # "square" (1080x1080) or "4x6" (1080x1620)
GIF_VARIANTS=3             # Number of GIFs to generate per product
```

### 3. Create Product Manifests

Create YAML files in `/products/*.yml`:

```yaml
products:
  - external_id: "ig:POST_ID:product-slug"
    name: "Solar Step Lights"
    category: "Lighting"
    description: "Boost curb appeal instantly"
    assets_dir: "assets/lighting/solar-step-lights"
    amazon_url: "https://www.amazon.com/dp/B0123456"
    aliexpress_candidates:
      - "https://www.aliexpress.com/item/1234567890.html"
      - "https://www.aliexpress.com/item/0987654321.html"
    min_sales: 300
    top_n: 3
    inspiration_reels:
      - "https://www.instagram.com/reel/ABC123/"
    headline: "Transform your entrance"
    ad_copy: "(fast & free shipping)"
```

### 4. Add Assets (Optional)

**GIFs are now AUTO-GENERATED!** Just provide the `inspiration_reels` URL in your YAML.

Optionally create folders matching `assets_dir` for additional assets:

```
assets/
  lighting/
    solar-step-lights/
      main.jpg                 # 1080x1080, light grey background
      lifestyle-1.jpg          # Optional lifestyle shots
      lifestyle-2.jpg
      demo.mp4                 # Optional demo video
```

**What happens automatically:**
- System downloads the reel using `yt-dlp`
- Uses OpenCV to scan every frame for text overlays
- Finds 3-6 second segments with NO visible text
- Crops to square (1080x1080) or 4x6 tall
- Encodes with ffmpeg palettegen for high quality
- Budgets FPS (24→10) then resolution to stay ≤20MB
- Uploads 3 GIFs per product automatically

### 5. Run Import

```bash
python3 scripts/revoa_import.py
```

## How It Works

### Price-First + Auto-GIF Workflow

1. **Pricing Validation** (NO assets uploaded yet)
   - Fetches Amazon price (Prime-only required)
   - Checks top 3 AliExpress candidates (includes shipping + min sales threshold)
   - Enforces rule: `AE ≤ 50% of Amazon` OR `spread ≥ $20`

2. **Asset Upload** (only if pricing passes)
   - Uploads any local images/videos from `assets_dir`
   - **Auto-GIF Generation**:
     - Downloads reel with `yt-dlp`
     - Scans frames for text using OpenCV MSER + edge detection
     - Finds 3-6s windows where 90%+ frames are text-free
     - Crops to center square or 4x6 ratio
     - Encodes with ffmpeg palettegen (high quality)
     - Budgets: try 24fps → reduce to 10fps → reduce resolution
     - Keeps every GIF ≤20MB (Shopify limit)
     - Uploads 3 GIFs per product

3. **Copy Generation**
   - Auto-creates 3 product titles (category-specific angles)
   - Generates 3 description blocks (benefit-led)
   - Creates ad copy variants (headlines, primary text, descriptions)

4. **Product Import** (UPSERT mode)
   - Calculates RRP = 3× AliExpress total
   - Creates/updates product via Edge Function
   - Includes price proof links + auto-generated copy in metadata

### Pricing Rule Examples

✅ **PASS**: AE $8 vs Amazon $25 (32% of Amazon)
✅ **PASS**: AE $15 vs Amazon $40 (spread = $25)
❌ **FAIL**: AE $20 vs Amazon $35 (57% of Amazon, spread = $15)

## Field Reference

### Required Fields

- `external_id` - Unique identifier (no date suffix for UPSERT)
- `name` - Product name
- `category` - Category (Lighting, Home, Fitness, etc.)
- `description` - Benefit-focused description
- `amazon_url` - Amazon product URL (must be Prime)
- `aliexpress_candidates` - Array of 2-3 AliExpress URLs

### Optional Fields

- `assets_dir` - Path to assets folder
- `min_sales` - Minimum sales threshold (default: 300)
- `top_n` - How many AE candidates to check (default: 3)
- `supplier_price` - Fallback if scraping fails
- `inspiration_reels` - Instagram reel URLs
- `headline` - Ad headline
- `ad_copy` - Ad copy text

## Categories

- Lighting
- Home
- Fitness
- Beauty
- Kitchen
- Garden
- Electronics
- Pets
- Kids
- Sports

## Output

Products that pass pricing go to `/admin/product-approvals` with:
- Status: `pending_approval`
- Pricing metadata attached
- All assets uploaded and linked

## Troubleshooting

### "Login failed"
Check your environment variables are set correctly.

### "AliExpress price not found"
- Add explicit `supplier_price` as fallback
- Check URL is valid and product is still available
- Verify minimum sales threshold isn't too high

### "Not Prime eligible"
Amazon URL must point to Prime-eligible product.

### "No GIFs found"
Add at least 3 GIFs (text-free) to assets folder.

## GitHub Actions

To run automatically on commit:

```yaml
# .github/workflows/import-products.yml
name: Import Products
on:
  push:
    paths:
      - 'products/*.yml'
      - 'assets/**'

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install requests pyyaml
      - run: python3 scripts/revoa_import.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          REVOA_ADMIN_EMAIL: ${{ secrets.REVOA_ADMIN_EMAIL }}
          REVOA_ADMIN_PASSWORD: ${{ secrets.REVOA_ADMIN_PASSWORD }}
```

---

# Test Order Creation Script

A simple script to generate test orders in Shopify for testing subscription limits and order-based features.

## Overview

The `create-test-orders.ts` script creates 100 test orders in the revoatest Shopify store. This is useful for:
- Testing subscription blocking logic based on order count
- Validating order-based tier limits
- Testing order sync webhooks and processing

## Quick Start

### Prerequisites

- Node.js 20+ installed
- Access to the Supabase database
- A Shopify store (revoatest) with at least one product

### Environment Variables

The script uses these environment variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

These should already be configured in your `.env` file.

### Run the Script

```bash
npm run test-orders
```

Or directly:
```bash
npx tsx scripts/create-test-orders.ts
```

## How It Works

1. **Connects to Supabase** - Fetches the revoatest store credentials
2. **Fetches Products** - Gets the first product from the store
3. **Creates Draft Orders** - Generates 100 draft orders with test data
4. **Completes Orders** - Converts each draft order into a real order
5. **Progress Tracking** - Logs progress every 10 orders

## What Gets Created

Each test order includes:
- A single line item using the first available product variant
- Random customer names (from a preset list)
- Sequential test email addresses (test-customer-1@example.com, etc.)
- Standard test shipping/billing addresses
- A note indicating it's a test order

## Rate Limiting

The script includes a 500ms delay between requests to respect Shopify's API rate limits. Creating 100 orders takes approximately 50-60 seconds.

## Output

The script provides:
- Real-time progress updates (every 10 orders)
- Success/failure counts
- Total execution time
- Error details for any failed orders

Example output:
```
=================================
Test Order Creation Script
=================================

📦 Initializing Supabase client...
🔍 Fetching revoatest store credentials...
✅ Found store: revoatest.myshopify.com
📦 Fetching products from store...
✅ Using product: Test Product
   Variant: Default Title ($29.99)

🚀 Creating 100 test orders...

✅ Created 10/100 orders (10 successful, 0 failed)
✅ Created 20/100 orders (20 successful, 0 failed)
...

=================================
Summary
=================================
Total orders: 100
✅ Successful: 100
❌ Failed: 0
⏱️  Duration: 52.3s
=================================

✅ All test orders created successfully!
```

## Troubleshooting

### "Could not find revoatest store"
Make sure the store exists in the `shopify_stores` table with `store_url` containing "revoatest".

### "No products found in store"
Create at least one product in your Shopify store before running the script.

### "GraphQL errors"
Check that the store's access token is valid and has the necessary permissions (write_orders, write_draft_orders).

### Rate Limit Errors
If you encounter rate limiting issues, increase the `DELAY_BETWEEN_REQUESTS` constant in the script.

## Cleanup

To remove test orders after testing:
1. Go to your Shopify admin
2. Navigate to Orders
3. Filter by note: "Generated by test script"
4. Bulk select and archive/delete the orders

## Configuration

You can modify these constants at the top of the script:
- `NUM_ORDERS` - Number of orders to create (default: 100)
- `DELAY_BETWEEN_REQUESTS` - Delay in milliseconds (default: 500)
- Customer name lists for variation
