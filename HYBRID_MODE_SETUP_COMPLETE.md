# Hybrid Mode Setup Complete

Your hybrid product import system is now fully configured and ready to use!

## What Was Implemented

### 1. New Python Script: `scripts/revoa_hybrid.py`
A dedicated hybrid mode importer that:
- Downloads Instagram reels using yt-dlp
- Generates 3 GIFs (2-5 seconds each with safe margins)
- Extracts a main product image (1080x1080 with light grey background)
- Scrapes Amazon Prime prices
- Scrapes AliExpress total prices (item + shipping)
- Enforces pricing rules (AE ≤ 50% Amazon OR spread ≥ $20)
- Generates product descriptions and ad copy
- Uploads all assets to Supabase Storage
- Creates/updates products via the import-products Edge Function

### 2. Updated GitHub Actions Workflow
Modified `.github/workflows/import-products.yml` to:
- Accept new hybrid mode inputs (product_name, category, reel_url, amazon_url, aliexpress_url, soft_pass)
- Conditionally run `revoa_hybrid.py` when mode is "hybrid"
- Fall back to autonomous mode (`revoa_import.py`) for regular imports

### 3. Updated Edge Function: `agent-dispatch`
Enhanced `supabase/functions/agent-dispatch/index.ts` to:
- Accept hybrid mode parameters from the UI
- Pass all required fields to GitHub Actions workflow
- Support category selection
- Support soft_pass toggle for flexible pricing validation

### 4. Enhanced Admin UI: `/admin/import-products`
Updated `src/pages/admin/ProductImport.tsx` to include:
- **Product Name** field (required)
- **Category** dropdown (required) - defaults to "Home & Garden"
- **Sample Instagram Reel URL** field
- **Amazon Product URL** field
- **AliExpress Product URL** field
- **Soft Pass Pricing** toggle - imports even if pricing data is incomplete

## How to Use

### From the Admin Dashboard

1. Navigate to `/admin/import-products`
2. Select "AI-Assisted (Hybrid)" mode
3. Fill in the form:
   - **Product Name**: e.g., "Solar Step Lights"
   - **Category**: Select from dropdown (Lighting, Home, Fitness, etc.)
   - **Instagram Reel**: Paste the reel URL
   - **Amazon URL**: Paste the product URL (optional but recommended)
   - **AliExpress URL**: Paste the product URL (optional but recommended)
   - **Soft Pass**: Check if you want to import even with missing prices
4. Click "Run AI Agent"
5. Monitor progress in the AI Import Jobs page

### What Happens Next

1. **Job Creation**: System creates an import job in Supabase
2. **GitHub Actions**: Triggers the workflow with your inputs
3. **Python Script Runs**:
   - Downloads the reel
   - Creates GIFs and main image
   - Scrapes prices from Amazon & AliExpress
   - Validates pricing rules
   - Generates product copy
   - Uploads assets to Storage
   - Imports product to database
4. **Callback**: Results are posted back to Supabase
5. **Notification**: You see the result in the UI

## Pricing Rules

The hybrid mode enforces these rules (unless soft_pass is enabled):

- **Rule 1**: AliExpress total ≤ 50% of Amazon price
- **Rule 2**: OR spread ≥ $20 (Amazon - AliExpress)
- **Soft Pass**: If enabled, imports even if prices are missing or don't meet the rules

## Environment Variables Required

The following must be set in your GitHub Secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ADMIN_EMAIL` (or `REVOA_ADMIN_EMAIL`)
- `ADMIN_PASSWORD` (or `REVOA_ADMIN_PASSWORD`)
- `GITHUB_TOKEN` (with repo and workflow permissions)

## File Structure

```
scripts/
├── revoa_hybrid.py          # New hybrid mode importer
└── revoa_import.py          # Existing autonomous importer

.github/workflows/
└── import-products.yml      # Updated with hybrid mode support

supabase/functions/
└── agent-dispatch/          # Updated to pass hybrid params
    └── index.ts

src/pages/admin/
└── ProductImport.tsx        # Enhanced UI with category & soft_pass
```

## Next Steps

1. **Test the flow**: Try importing a product via the admin UI
2. **Monitor logs**: Check GitHub Actions for detailed execution logs
3. **Review imports**: Check the AI Import Jobs page for results
4. **Iterate**: Adjust pricing rules or copy templates as needed

## Troubleshooting

### Product not importing?
- Check GitHub Actions logs for errors
- Verify all URLs are valid and accessible
- Ensure pricing data is available (or enable soft_pass)

### GIFs not generating?
- Verify ffmpeg is installed in GitHub runner (it is by default)
- Check video duration (needs at least 2 seconds)

### Pricing validation failing?
- Enable "Soft Pass Pricing" to bypass validation
- Check that Amazon shows Prime pricing
- Verify AliExpress URL loads correctly

## Support

For issues or questions, check:
- GitHub Actions run logs
- AI Import Jobs page in admin dashboard
- Supabase Edge Function logs
