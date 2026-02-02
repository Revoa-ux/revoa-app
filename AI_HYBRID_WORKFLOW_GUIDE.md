# Hybrid AI Workflow - Complete Setup Guide

## Overview

The Hybrid AI Workflow automates product media generation and marketing copy creation. Admins provide basic product information, and the AI agent handles everything else.

## What the AI Agent Does Automatically

### 1. Media Processing
- **Reel Download**: Downloads Instagram Reel as MP4
- **GIF Generation**: Creates 3 GIFs (2-5 seconds each) from clean segments without text/logos
- **Image Scraping**: Extracts HD product images from Amazon and AliExpress
- **Background Removal**: Removes existing backgrounds using remove.bg API (optional)
- **Image Optimization**: Adds neutral grey background, resizes to 1080×1080
- **Quality Enhancement**: Ensures Shopify-ready format

### 2. Marketing Copy Generation
- **Product Descriptions**: 3-section Shopify product page copy
- **Meta Ads Copy**: 6 headlines, 3 primary texts, 3 descriptions
- **Multiple Variants**: 3 product title options

### 3. Data Management
- **Asset Storage**: Uploads all media to Supabase Storage
- **Database Import**: Creates product entry via import-products endpoint
- **Price Scraping**: Automatically scrapes prices if not provided (optional)

## Admin Input Requirements

### Required Fields
- **Product Title**: Clear, descriptive product name
- **Instagram Reel URL**: Link to product demonstration reel

### Optional Fields
- **Amazon URL**: For image scraping and price reference
- **AliExpress URL**: For image scraping and supplier pricing
- **Amazon Price**: Manual price input (overrides scraping)
- **AliExpress Price**: Manual price input (overrides scraping)
- **Suggested Retail Price**: Your recommended selling price

## Environment Variables Required

Add these to your GitHub repository secrets:

### Required Secrets
```bash
SUPABASE_URL              # Your Supabase project URL
SUPABASE_ANON_KEY         # Supabase anonymous key
REVOA_ADMIN_TOKEN         # Admin authentication token
ADMIN_EMAIL               # Admin login email
ADMIN_PASSWORD            # Admin login password
```

### Optional Secrets (for enhanced features)
```bash
OPENAI_API_KEY            # For AI-generated marketing copy
CANVA_API_KEY             # For background removal + 2x upscale (RECOMMENDED)
GITHUB_TOKEN              # For workflow dispatch (already configured)
GITHUB_OWNER              # Your GitHub username
GITHUB_REPO               # Repository name
```

## API Keys Setup

### OpenAI API Key (Recommended)
1. Sign up at https://platform.openai.com/
2. Navigate to API Keys section
3. Create new secret key
4. Add to GitHub secrets as `OPENAI_API_KEY`

**Without OpenAI**: System falls back to template-based copy generation

### Canva API Key (Highly Recommended)
1. Log into your Canva Pro account at https://www.canva.com/
2. Go to Settings > Apps & integrations
3. Create a new API key for your application
4. Add to GitHub secrets as `CANVA_API_KEY`

**Benefits of Canva API**:
- Unlimited background removal (included with Pro subscription)
- Automatic 2x upscaling for HD quality
- Professional-grade image processing
- No per-image limits or additional costs

**Without Canva**: Images processed without background removal (product images will have original backgrounds)

## How to Use

### Method 1: Via Admin UI (Recommended)

1. Navigate to `/admin/ai-import`
2. Fill in the form:
   - Product Title (required)
   - Instagram Reel URL (required)
   - Amazon/AliExpress URLs (optional)
   - Prices (optional - will auto-scrape if URLs provided)
3. Click "Generate Product Assets"
4. Monitor job status in the "Recent Jobs" table
5. Review generated product at `/admin/product-approvals`

### Method 2: Direct GitHub Workflow

1. Go to your repository's Actions tab
2. Select "import-products" workflow
3. Click "Run workflow"
4. Fill in parameters:
   ```
   mode: hybrid
   product_name: Solar LED Garden Lights
   reel_url: https://www.instagram.com/reel/ABC123/
   amazon_url: https://www.amazon.com/dp/B08XYZ/
   amazon_price: 29.99
   aliexpress_url: https://www.aliexpress.com/item/...
   aliexpress_price: 12.50
   suggested_retail_price: 49.99
   ```

## Workflow Steps (Behind the Scenes)

1. **Job Creation**: Admin submits form → Creates import_job record
2. **Workflow Dispatch**: Triggers GitHub Action with parameters
3. **Environment Setup**: Installs Python, ffmpeg, yt-dlp
4. **Reel Download**: Downloads Instagram Reel using yt-dlp
5. **Video Analysis**: Detects text-free segments for GIF extraction
6. **GIF Creation**: Generates 3 optimized GIFs (2-5s, <20MB each)
7. **Image Scraping**: Downloads product images from Amazon/AliExpress
8. **Image Processing**:
   - Removes backgrounds (if API key available)
   - Adds neutral grey background
   - Resizes to 1080×1080
9. **Price Scraping**: Gets Amazon Prime and AliExpress prices (if URLs provided)
10. **Copy Generation**:
    - Generates marketing copy via OpenAI
    - Falls back to templates if API unavailable
11. **Asset Upload**: Uploads all images/GIFs to Supabase Storage
12. **Product Creation**: Inserts product into database
13. **Job Completion**: Updates import_job status with results

## Output Structure

### Supabase Storage Structure
```
product-assets/
  └── {category-slug}/
      └── {product-slug}/
          ├── image-1.jpg  (main image)
          ├── image-2.jpg  (additional images)
          ├── image-3.jpg
          ├── gif-1.gif    (product demo GIFs)
          ├── gif-2.gif
          └── gif-3.gif
```

### Product Database Entry
```json
{
  "external_id": "ig:{reel_id}:{slug}",
  "name": "Product Title",
  "description": "Full Shopify-ready description with sections",
  "category": "Home & Garden",
  "supplier_price": 12.50,
  "recommended_retail_price": 49.99,
  "images": [
    {"url": "...", "type": "main", "display_order": 0},
    {"url": "...", "type": "additional", "display_order": 1}
  ],
  "creatives": [
    {"type": "reel", "url": "...", "is_inspiration": true},
    {"type": "ad", "url": "...", "headline": "...", "ad_copy": "..."}
  ],
  "metadata": {
    "amazon_url": "...",
    "amazon_price": 29.99,
    "aliexpress_price": 12.50,
    "generated_copy": {...},
    "ai_generated": true
  }
}
```

## Troubleshooting

### Common Issues

**1. "yt-dlp failed: no mp4 downloaded"**
- Instagram may be blocking automated downloads
- Try using a different reel URL
- Check if reel is public and accessible

**2. "Background removal failed"**
- Check REMOVEBG_API_KEY is set correctly
- Verify you haven't exceeded free tier limit (50/month)
- System will continue without background removal

**3. "OpenAI API error"**
- Verify OPENAI_API_KEY is valid
- Check you have API credits available
- System will fall back to template copy

**4. "GitHub workflow dispatch failed"**
- Ensure GITHUB_TOKEN has `repo` and `workflow` scopes
- Verify GITHUB_OWNER and GITHUB_REPO are correct

### Debug Steps

1. Check recent jobs table in `/admin/ai-import`
2. Click on failed job to see error details
3. View GitHub Actions run for detailed logs
4. Check Supabase logs for database errors

## Best Practices

### Product Selection
- Choose reels with clear product demonstrations
- Avoid reels with excessive text overlays
- Prefer reels with good lighting and product visibility

### Pricing Strategy
- Provide manual prices when possible (more accurate)
- If auto-scraping, verify prices after import
- Ensure sufficient margin between supplier and retail price

### Image Quality
- Amazon typically has better product images
- AliExpress often has more variety
- System will process up to 5 images total

### Marketing Copy
- Review AI-generated copy before publishing
- Customize copy for brand voice if needed
- Test different title variants for conversion

## Performance Expectations

- **Single Product Processing**: 2-5 minutes
- **GIF Generation**: 30-60 seconds per GIF
- **Image Processing**: 10-20 seconds per image
- **Copy Generation**: 15-30 seconds

## Scaling Considerations

- Free tier limits:
  - remove.bg: 50 images/month
  - OpenAI: $5/month credit for new accounts
- Consider upgrade for high-volume usage
- Batch processing: Can queue multiple products

## Support

For issues or questions:
1. Check job error messages in admin UI
2. Review GitHub Actions logs
3. Check Supabase function logs
4. Contact support with job_id for investigation
