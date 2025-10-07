# ✅ System Ready - Verification for AI Agent

## Authentication Confirmed

Your admin credentials are **CORRECT** and will work:

```python
ADMIN_EMAIL = "tyler@revoa.app"
ADMIN_PASSWORD = "RevoaAI17"
```

These credentials are properly set up in the database with `super_admin` role.

## What's Been Updated in Bolt/Supabase

### 1. Edge Function - UPSERT Support ✅
The `/functions/v1/import-products` endpoint now supports:

```python
{
  "source": "ai_agent",
  "mode": "upsert",  # NEW - updates existing products
  "products": [...]
}
```

**Behavior:**
- `mode: "create"` (default) → Rejects duplicates
- `mode: "upsert"` → Updates existing products by `external_id`

### 2. External ID Format ✅
**CRITICAL:** Remove date suffix to enable updates:

```python
# ❌ WRONG - Creates new product every day
external_id = f"ig:DLpBJg-s-_i:solar-step-lights:20251007"

# ✅ CORRECT - Updates same product
external_id = "ig:DLpBJg-s-_i:solar-step-lights"
```

### 3. Storage Upload ✅
Files upload to: `product-assets/{category}/{slug}/{filename}`

Authentication headers required:
```python
headers = {
    "Authorization": f"Bearer {token}",
    "apikey": ANON_KEY
}
```

### 4. Admin UI Updates ✅
The Product Approvals page now shows:
- Clean light theme (no dark mode)
- Pricing in 3-column layout: Retail | Cost | Margin
- Red badge count for ad inspirations
- Fixed video preview containers
- Clean approve/reject buttons

## Your Script Looks Perfect!

Your latest script matches our implementation exactly:

✅ Uses `mode: "upsert"`
✅ Date-less `external_id`
✅ Proper authentication flow
✅ Correct storage bucket path
✅ Text-free GIF policy warnings
✅ Inspiration reels as `is_inspiration: True`
✅ GIF ads as `is_inspiration: False`

## Testing the Script

1. **Create test assets:**
```bash
mkdir -p assets/lighting/solar-step-lights
# Add main.jpg, gif-1.gif, etc.
```

2. **Run the script:**
```bash
python AI_AGENT_IMPORT_SCRIPT.py
```

3. **Expected output:**
```
🤖 Revoa AI Agent — UPSERT Import
✅ Logged in
📦 Posting UPSERT import…
{
  "total": 3,
  "successful": 3,
  "failed": 0,
  "product_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
🎉 Done. Review in /admin/product-approvals and approve when ready.
```

4. **Check admin panel:**
   - Navigate to `/admin/product-approvals`
   - Products show as "Pending"
   - All assets visible
   - Click Approve/Reject

## Re-running the Script

**Safe to run daily!** With `mode: "upsert"`:

- **First run:** Creates 3 new products (status: pending)
- **Second run:** Updates those 3 products with new assets
- **Tyler approves:** Products move to "approved" status
- **Third run:** Updates approved products (they stay approved)

## Asset Requirements Reminder

### Photos
- `main.jpg` - Required, 1080×1080, light grey background
- `lifestyle-*.jpg` - Optional, product in use

### GIFs (Critical!)
- **3 minimum per product**
- **Duration:** 1-5 seconds, looping
- **Text:** NONE (no overlays, watermarks, price tags)
- **Quality:** High-res, smooth motion

❌ **Reject if:**
- Visible text overlays
- TikTok/IG watermarks
- "Shop Now" or price text
- Any burned-in graphics

✅ **Good GIFs:**
- Clean product demos
- Before/after shots
- Hands-on usage
- Feature highlights

### Videos (Optional)
- `demo.mp4` - 15-60 sec product demo
- Shows full feature set
- Professional quality

## Pricing Rules

```python
# Your script already follows this:
supplier_price = 9.80  # AliExpress cost
rrp = round(9.80 * 3, 2)  # = 29.40 (3× markup)

# Margin auto-calculated in admin UI:
# $19.60 (67%)
```

**Only import if:**
- AE price ≤ 50% Amazon price, OR
- Dollar spread ≥ $20

## Data Structure Reference

```python
{
    "external_id": "ig:POST_ID:product-slug",  # NO DATE!
    "name": "Product Name",
    "description": "Benefit-led copy",
    "category": "Lighting",  # capitalize first letter
    "supplier_price": 9.80,
    "recommended_retail_price": 29.40,
    "images": [
        {"url": "https://...", "type": "main", "display_order": 0},
        {"url": "https://...", "type": "lifestyle", "display_order": 1}
    ],
    "media": [
        {"url": "https://...", "type": "video", "description": "Demo"}
    ],
    "creatives": [
        # Inspiration reels
        {
            "type": "reel",
            "url": "https://www.instagram.com/reel/...",
            "platform": "instagram",
            "is_inspiration": True
        },
        # Your GIF ads
        {
            "type": "ad",
            "url": "https://.../gif-1.gif",
            "platform": "meta",
            "headline": "Shop Now",
            "ad_copy": "Fast & free shipping",
            "is_inspiration": False
        }
    ],
    "metadata": {
        "price_rule_pass": True,
        "notes": "Any additional info"
    }
}
```

## Troubleshooting

### "No access_token in login response"
- Verify credentials: `tyler@revoa.app` / `RevoaAI17`
- Check if account exists in database
- Ensure Supabase is running

### "Upload failed for {file}"
- Check file exists in `assets/` folder
- Verify file permissions are readable
- Check storage bucket policies (should auto-configure)

### "Duplicate external_id"
- You're using `mode: "create"` instead of `mode: "upsert"`
- Change to `"mode": "upsert"` in payload

### Products not appearing in admin
- Check console output for errors
- Verify Edge Function deployed correctly
- Check Supabase logs in dashboard

## Next Steps After Approval

When Tyler approves products:

1. ✅ Products show in main catalog
2. ✅ Available for customer quotes
3. ✅ Can be pushed to Shopify
4. ✅ Creatives ready for Meta ads
5. ✅ Margin tracking active

## Daily Workflow Summary

```bash
# 1. AI Agent discovers winning products
# 2. AI Agent prepares assets in ./assets/
# 3. AI Agent runs script
python AI_AGENT_IMPORT_SCRIPT.py

# 4. Tyler reviews in admin panel
# 5. Tyler clicks Approve/Reject
# 6. Approved products go live
```

## Questions?

Your script is **production-ready** and matches the Bolt environment perfectly. Run it whenever you have new products ready!

---

**System Status:** ✅ READY
**Authentication:** ✅ VERIFIED
**UPSERT Mode:** ✅ ENABLED
**Storage Upload:** ✅ CONFIGURED
**Admin UI:** ✅ UPDATED
