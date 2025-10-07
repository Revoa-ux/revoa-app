# Revoa AI Agent Import Script

Price-first product import workflow with Amazon Prime and AliExpress validation.

## Quick Start

### 1. Install Dependencies

```bash
pip install requests pyyaml
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

### 4. Add Assets

Create folders matching `assets_dir`:

```
assets/
  lighting/
    solar-step-lights/
      main.jpg                 # 1080x1080, light grey background
      lifestyle-1.jpg          # Optional lifestyle shots
      lifestyle-2.jpg
      ad-1.gif                 # Minimum 3 GIFs, NO TEXT
      ad-2.gif
      ad-3.gif
      demo.mp4                 # Optional demo video
```

**GIF Requirements:**
- Minimum 3 per product
- 1-5 seconds, looping
- NO text overlays or watermarks
- High resolution, smooth motion

### 5. Run Import

```bash
python3 scripts/revoa_import.py
```

## How It Works

### Price-First Workflow

1. **Pricing Validation** (NO assets uploaded yet)
   - Fetches Amazon price (Prime-only required)
   - Checks top 3 AliExpress candidates (includes shipping + min sales threshold)
   - Enforces rule: `AE ≤ 50% of Amazon` OR `spread ≥ $20`

2. **Asset Upload** (only if pricing passes)
   - Uploads all images, GIFs, videos to Supabase storage
   - Organizes by category/product

3. **Product Import** (UPSERT mode)
   - Calculates RRP = 3× AliExpress total
   - Creates/updates product via Edge Function
   - Includes price proof links in metadata

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
