# Updated Instructions for AI Agent

## ✅ System is Ready for You

The Bolt/Supabase environment has been updated to support your daily product import workflow. Here's what changed:

## Critical Fixes Applied

### 1. External ID Format (FIXED)
**You MUST remove the date suffix from external_id:**

```python
# ❌ WRONG - Creates duplicate products every day
external_id = f"ig:DLpBJg-s-_i:solar-step-lights:{today}"

# ✅ CORRECT - Updates same product each time
external_id = "ig:DLpBJg-s-_i:solar-step-lights"
```

### 2. UPSERT Mode (ENABLED)
The import API now supports updating existing products:

```python
payload = {
    "source": "ai_agent",
    "mode": "upsert",  # NEW: Updates existing products instead of rejecting
    "products": products
}
```

**Behavior:**
- First run with `external_id: "ig:ABC:product-name"` → Creates new product
- Second run with same `external_id` → Updates existing product with new assets
- No more "duplicate" errors!

## Updated Python Script

Use the corrected script at: `AI_AGENT_IMPORT_SCRIPT.py`

Key changes:
1. ✅ Removed date suffix from `external_id`
2. ✅ Added `mode: "upsert"` to payload
3. ✅ Improved error handling for existing files
4. ✅ Better logging and progress reporting

## Your Daily Workflow

### 1. Organize Assets
```
assets/
  category/product-slug/
    main.jpg              # Required
    lifestyle-1.jpg       # Optional
    lifestyle-2.jpg       # Optional
    gif-1.gif            # Text-free only (1-5s)
    gif-2.gif            # Text-free only
    gif-3.gif            # Text-free only
    demo.mp4             # Optional
```

### 2. Run Import Script
```bash
python AI_AGENT_IMPORT_SCRIPT.py
```

The script will:
- Login with admin credentials
- Upload all files to Supabase storage
- Create/update products via API
- Set status to "pending" for Tyler's review

### 3. Tyler Approves
Tyler logs into admin panel at `/admin/product-approvals` to:
- Review pricing/margins
- Check asset quality
- Watch inspiration reels
- Approve or reject each product

## Product Structure

```python
{
    "external_id": "ig:POST_ID:product-slug",  # NO DATE SUFFIX!
    "name": "Product Name",
    "description": "Benefit-led description",
    "category": "Lighting|Home|Fitness|Kitchen|etc",
    "supplier_price": 9.80,  # AliExpress price
    "recommended_retail_price": 29.40,  # 3x markup
    "images": [
        {"url": "https://...", "type": "main", "display_order": 0},
        {"url": "https://...", "type": "lifestyle", "display_order": 1}
    ],
    "media": [
        {"url": "https://...", "type": "video", "description": "Demo"}
    ],
    "creatives": [
        {
            "type": "reel",
            "url": "https://www.instagram.com/reel/...",
            "platform": "instagram",
            "is_inspiration": True
        },
        {
            "type": "ad",
            "url": "https://.../gif-1.gif",
            "platform": "meta",
            "headline": "Shop Now",
            "ad_copy": "Fast & free shipping",
            "is_inspiration": False
        }
    ]
}
```

## Asset Requirements

### Photos
- **Format**: 1080×1080 JPEG
- **Background**: Very light grey (#F5F5F5)
- **Required**: At least 1 `main.jpg` per product
- **Optional**: Up to 3 lifestyle shots

### GIFs (Critical!)
- **Duration**: 1-5 seconds
- **Text**: NONE (no burned-in text or watermarks)
- **Quality**: High resolution, smooth loops
- **Count**: 3 per product minimum

❌ **Reject GIFs with:**
- Burned-in text overlays
- Watermarks from TikTok/IG
- Price tags or "Shop Now" text
- Any visible text/logos

✅ **Good GIFs show:**
- Product in use (hands-on demo)
- Before/after transformations
- Key features in action
- Clean, professional footage

### Videos
- **Format**: MP4, MOV, or WebM
- **Duration**: 15-60 seconds
- **Purpose**: Full product demo
- **Optional**: Not required, but nice to have

## Pricing Rules

**Tyler's requirement:** Minimum 3× markup

```python
supplier_price = 9.80  # AliExpress cost
recommended_retail_price = 9.80 * 3  # = 29.40

# Margin calculation (auto-displayed in admin):
# Margin = $19.60 (67%)
```

**Only import products where:**
- AliExpress price ≤ 50% of Amazon price, OR
- Dollar spread ≥ $20

## Storage Structure

Files upload to: `product-assets/{category}/{product-slug}/{filename}`

Example:
```
product-assets/
  lighting/solar-step-lights/
    main.jpg
    lifestyle-1.jpg
    gif-1.gif
    gif-2.gif
    gif-3.gif
```

## Error Handling

The script handles:
- ✅ File already exists → Uses existing URL
- ✅ Missing folder → Skips with warning
- ✅ Upload failure → Reports error but continues
- ✅ Duplicate external_id → Updates existing product (UPSERT)

## Testing Your Setup

1. Create a test product folder:
```bash
mkdir -p assets/test/sample-product
# Add main.jpg and gif-1.gif
```

2. Run the script:
```bash
python AI_AGENT_IMPORT_SCRIPT.py
```

3. Check admin panel at `/admin/product-approvals`

## Automation Options

### Daily Cron Job
```bash
# Run every day at 9 AM
0 9 * * * cd /path/to/project && python AI_AGENT_IMPORT_SCRIPT.py
```

### Manual Trigger
```bash
python AI_AGENT_IMPORT_SCRIPT.py
```

## What Happens After Import

1. Products appear in "Product Approvals" with status: **Pending**
2. Tyler reviews each product:
   - Pricing/margins displayed automatically
   - All assets (images, GIFs, videos) visible
   - Inspiration reels linked
3. Tyler clicks **Approve** or **Reject**
4. Approved products:
   - ✅ Show in Products catalog
   - ✅ Available for quote requests
   - ✅ Can be pushed to Shopify
   - ✅ Creatives ready for Meta ads

## Questions?

**Issue**: Products not appearing in admin panel
- Check `external_id` format (no date suffix)
- Verify `mode: "upsert"` in payload
- Check console output for errors

**Issue**: Assets not loading
- Ensure files match naming patterns
- Check folder structure is correct
- Verify files uploaded to Supabase storage

**Issue**: GIFs rejected by Tyler
- Re-extract clean segments without text
- Use video editing to crop out watermarks
- Find alternative source footage

## Summary

You can now run your import script daily and Tyler will:
1. See all new/updated products in the admin panel
2. Review pricing, assets, and quality
3. Approve the winners with one click

The system handles everything else automatically!
