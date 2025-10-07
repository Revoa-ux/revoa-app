# AI Agent Daily Workflow Guide

## Overview

This guide explains how your AI agent can automatically import products into the admin approval queue once per day. The system uses **UPSERT mode**, which means:

- **New products** with unique `external_id` → Created as pending approval
- **Existing products** with matching `external_id` → Updated with new assets/data

## Key Changes from Original Script

### 1. Fixed External ID Format
**BEFORE (Wrong):**
```python
external_id = f"ig:DLpBJg-s-_i:solar-step-lights:{today}"
# Creates NEW product every day: solar-step-lights:20251007, solar-step-lights:20251008, etc.
```

**AFTER (Correct):**
```python
external_id = "ig:DLpBJg-s-_i:solar-step-lights"
# Updates SAME product each time
```

### 2. UPSERT Mode Enabled
```python
payload = {
    "source": "ai_agent",
    "mode": "upsert",  # Updates existing products instead of rejecting
    "products": products
}
```

### 3. Asset Structure Requirements

Your AI agent should organize files like this:

```
assets/
  lighting/solar-step-lights/
    main.jpg              # Primary product image (required)
    lifestyle-1.jpg       # Lifestyle shot 1
    lifestyle-2.jpg       # Lifestyle shot 2 (optional)
    gif-1.gif            # Text-free GIF (1-5s, no watermarks)
    gif-2.gif            # Text-free GIF
    gif-3.gif            # Text-free GIF
    demo.mp4             # Optional demo video

  home/under-door-draft-stopper/
    main.jpg
    lifestyle-1.jpg
    gif-1.gif
    gif-2.gif
    gif-3.gif

  fitness/resistance-bands/
    main.jpg
    lifestyle-1.jpg
    gif-1.gif
    gif-2.gif
    gif-3.gif
```

**CRITICAL RULES:**
- ✅ GIFs MUST be text-free (no burned-in text or watermarks)
- ✅ GIFs should be 1-5 seconds, looping content
- ✅ At least 1 `main.jpg` required per product
- ✅ File names must match patterns: `main.jpg`, `lifestyle-*.jpg`, `*.gif`, `*.mp4`

## Daily Import Workflow

### Step 1: AI Agent Discovers Products
Your AI agent should:
1. Browse Instagram/TikTok/FB for winning products
2. Score each product (hook/demo/quality/ship-ability)
3. Reject: gimmicky, fragile, bulky, hazmat, or big-box items
4. Check pricing (AE ≤ 50% Amazon OR $20+ spread)

### Step 2: AI Agent Prepares Assets
For approved products:
1. **Photos**: Clean 1080×1080 hero + lifestyle on light grey background
2. **GIFs**: Extract 3 text-free segments (1-5s each)
3. **Copy**: 3 benefit-led titles, 3 short descriptions
4. **Pricing**: Set RRP = 3× AE price, store source URLs

### Step 3: AI Agent Runs Import Script

```bash
python AI_AGENT_IMPORT_SCRIPT.py
```

The script will:
1. ✅ Login with admin credentials
2. ✅ Upload all files to `product-assets` bucket
3. ✅ Create/update products via Edge Function
4. ✅ Attach images, media, and inspiration creatives
5. ✅ Set status to `pending` for human approval

### Step 4: Human Review & Approval
Tyler logs into admin panel:
1. Navigate to **Product Approvals**
2. Review each product:
   - Check pricing/margins
   - Verify all assets loaded correctly
   - Watch inspiration reels
   - Review GIF quality (no text/watermarks)
3. Click **Approve** or **Reject**

## Product Data Structure

Each product should include:

```python
{
    "external_id": "ig:POST_ID:product-slug",  # NO DATE SUFFIX
    "name": "Product Name",
    "description": "Benefit-focused description",
    "category": "Lighting|Home|Fitness|Kitchen|etc",
    "supplier_price": 9.80,  # AliExpress cost
    "recommended_retail_price": 29.40,  # 3x markup
    "images": [
        {"url": "...", "type": "main", "display_order": 0},
        {"url": "...", "type": "lifestyle", "display_order": 1}
    ],
    "media": [
        {"url": "...", "type": "video", "description": "Demo"}
    ],
    "creatives": [
        # Inspiration reels (is_inspiration: true)
        {
            "type": "reel",
            "url": "https://www.instagram.com/reel/...",
            "platform": "instagram",
            "is_inspiration": True
        },
        # Your GIF ads (is_inspiration: false)
        {
            "type": "ad",
            "url": "https://.../gif-1.gif",
            "platform": "meta",
            "headline": "Shop Product Name",
            "ad_copy": "Fast & free shipping",
            "is_inspiration": False
        }
    ]
}
```

## Automation Options

### Option A: Scheduled Daily Run
Set up a cron job or scheduler:

```bash
# Run every day at 9 AM
0 9 * * * cd /path/to/project && python AI_AGENT_IMPORT_SCRIPT.py
```

### Option B: Manual Trigger
Run whenever you have new products ready:

```bash
python AI_AGENT_IMPORT_SCRIPT.py
```

### Option C: Watch Folder
Create a script that monitors the `assets/` folder and auto-imports when new folders appear.

## Error Handling

The script handles common issues:

- **File already exists**: Gracefully uses existing URL
- **Missing folder**: Skips with warning
- **Upload failed**: Reports error but continues
- **Duplicate external_id**: Updates existing product (UPSERT mode)

## Troubleshooting

### Products Not Appearing
1. Check `external_id` format (no date suffix)
2. Verify `mode: "upsert"` in payload
3. Check Edge Function logs in Supabase dashboard

### Assets Not Loading
1. Ensure files are in correct folder structure
2. Check file names match patterns (`main.jpg`, `lifestyle-*.jpg`, `*.gif`)
3. Verify files uploaded to Supabase storage bucket

### GIFs Have Text/Watermarks
- Re-extract clean segments from source video
- Use video editing to crop out text
- Find alternative ad creative

## Best Practices

1. **Batch Import**: Process 10-20 products per run
2. **Quality Over Quantity**: Better to approve 3 great products than 10 mediocre ones
3. **Consistent Naming**: Use kebab-case for folders/IDs (`solar-step-lights`)
4. **Asset Quality**: Always verify GIFs are text-free before upload
5. **Pricing Rule**: Maintain 3× markup minimum for healthy margins

## Next Steps

Once Tyler approves products, they automatically:
- ✅ Show in Products catalog
- ✅ Become available for quote requests
- ✅ Can be pushed to Shopify
- ✅ Creatives ready for Meta ad campaigns

---

**Questions?** Contact Tyler or check the admin dashboard for import logs.
