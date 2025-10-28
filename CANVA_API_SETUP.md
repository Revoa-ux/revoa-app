# Canva API Setup Guide

## Why Canva API?

Since you already have Canva Pro, using their API provides:

- **Unlimited background removal** (no per-image costs)
- **Automatic 2x upscaling** for HD quality images
- **Professional-grade processing** included with your subscription
- **No additional costs** - leverage what you're already paying for

## Setup Steps

### 1. Create Canva API Access

1. Log into your Canva Pro account at https://www.canva.com/
2. Navigate to **Settings** → **Apps & integrations**
3. Look for **API access** or **Developer settings**
4. Click **Create new API key** or **Generate API token**
5. Give it a name: "Revoa Product Import"
6. Copy the generated API key (you won't see it again!)

### 2. Add to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `CANVA_API_KEY`
5. Value: Paste your Canva API key
6. Click **Add secret**

### 3. Verify Integration

The AI agent will automatically use Canva for:
- Background removal on all product images
- 2x upscaling for crisp, HD quality
- Professional image processing

## What Canva Does

### Before Canva Processing
- Raw product images from Amazon/AliExpress
- Various backgrounds (white, colored, busy)
- Different sizes and qualities
- May include watermarks or branding

### After Canva Processing
1. **Background Removal**: Clean cutout of the product
2. **2x Upscale**: Doubles resolution for HD quality
3. **Grey Background**: Neutral, professional backdrop added
4. **Standardized Size**: Resized to 1080×1080 for Shopify

## Example Workflow

```
Original Amazon Image (800×600, white bg)
    ↓
Canva API: Remove background
    ↓
Canva API: Upscale 2x (1600×1200, transparent bg)
    ↓
Local Processing: Add grey background (1080×1080)
    ↓
Final Shopify-ready Image
```

## API Limits & Pricing

With **Canva Pro**:
- Unlimited API calls included
- No per-image fees
- No monthly limits
- Enterprise-grade processing

**Cost**: $0 additional (included with your Pro subscription)

## Troubleshooting

### "Canva API key not set"
- Verify `CANVA_API_KEY` is added to GitHub secrets
- Check the secret name is exactly: `CANVA_API_KEY`
- Ensure the API key is valid and not expired

### "Canva upload failed"
- Check your Canva Pro subscription is active
- Verify the API key has proper permissions
- Try regenerating the API key

### "Canva processing timeout"
- This is rare but can happen with very large images
- The system will fall back to processing without background removal
- Try using smaller source images from Amazon/AliExpress

## Fallback Behavior

If Canva API is unavailable:
1. System skips background removal
2. Processes images with original backgrounds
3. Still resizes and optimizes for Shopify
4. Continues workflow without errors

**Result**: Products still get imported, just without clean backgrounds

## Best Practices

### Image Quality Tips
- Start with highest resolution images from Amazon
- AliExpress images often have varying quality
- Canva's 2x upscale works best on 800×600+ images
- Products with complex backgrounds benefit most

### When to Use Canva
- All product photos from Amazon/AliExpress
- Instagram reel screenshots
- Any product image that needs professional polish

### When to Skip
- Images already on transparent background
- Professional product shots (already optimized)
- Very low-resolution images (<400px)

## Monitoring Usage

### Check Processing Status
1. Navigate to `/admin/ai-import`
2. View recent jobs
3. Look for "Canva processing complete" in logs

### View Results
1. Go to `/admin/product-approvals`
2. Review generated images
3. Check for clean backgrounds and HD quality

## Alternative: Manual Override

If you prefer manual control:
1. Don't set `CANVA_API_KEY`
2. System will skip automatic processing
3. Manually edit images in Canva
4. Upload processed images separately

**Recommendation**: Use API for automation and consistency

## Support Resources

- Canva API Docs: https://www.canva.com/developers/
- Canva Pro Support: https://www.canva.com/help/
- API Status: Check Canva's status page for outages

## Summary

Canva API integration gives you:
- Professional product images automatically
- No additional costs beyond your Pro subscription
- Unlimited processing with no usage limits
- HD quality through 2x upscaling
- Clean, consistent backgrounds for all products

**Setup time**: 5 minutes
**Ongoing cost**: $0 (included with Pro)
**Value**: Professional product photos for every import
