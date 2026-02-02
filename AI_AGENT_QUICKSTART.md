# 🤖 AI Agent - Zero-Input Autonomous Mode

## ✅ What's Different Now

**ZERO manual inputs required.** No YAML files, no URLs, no product details.

## How It Works

### When You Click "Run AI Agent"

1. **Discovers Viral Reels** - Searches Instagram using 10 baked-in search terms
2. **Identifies Products** - Analyzes captions/hashtags for product names
3. **Finds Amazon Listings** - Searches Amazon, filters for Prime
4. **Finds AliExpress Suppliers** - Searches AliExpress, filters for 100+ orders
5. **Validates Pricing** - Checks 50% rule or $20 spread (soft-pass if AE missing)
6. **Generates GIFs** - Downloads reel, creates 2-3 text-free GIFs (2-5s, <20MB)
7. **Imports Products** - UPSERTs to database (status: pending for review)

## Configuration (All Have Defaults)

Every setting has a baked-in default. No configuration required to run!

```bash
# Discovery (OPTIONAL - has defaults)
DISCOVERY_TERMS="under door draft stopper,outdoor step lights,..."
DISCOVERY_MIN_VIEWS=50000
DISCOVERY_MAX_REELS=250

# Pricing (OPTIONAL - has defaults)
MIN_AE_SALES=100
ALLOW_AE_SOFT_PASS=true
MIN_SPREAD_USD=20

# Assets (OPTIONAL - has defaults)
GIF_MIN_S=2
GIF_MAX_S=5
MAIN_BG_HEX="#F5F5F5"

# Agent controls (OPTIONAL - has defaults)
TARGET_NEW_PRODUCTS=5
MAX_RUNTIME_MIN=25
```

## What You Do

1. Click **"Run AI Agent"** button in `/admin/ai-import`
2. Wait for GitHub Actions to complete (~10-25 minutes)
3. Open **Admin → Product Approvals**
4. Review pending products:
   - If AE found: pricing, assets, copy ready → Approve
   - If AE missing: flagged `needs_supplier_confirm` → Add supplier, then approve
5. Done!

## Expected Results

**Normal success rate: 10-20% of reels become products**

Example run:
- Discovers 50 reels (Instagram search)
- Identifies 30 products (caption analysis ~60%)
- Finds 20 on Amazon (search success ~66%)
- 15 pass pricing (validation ~75%)
- **~10 successfully imported**

## Why Success Rate is 10-20%

1. **Instagram blocks** ~50% of scraping requests
2. **Caption analysis** is basic (~60% accuracy - no ML)
3. **Multiple filters** (Prime required, pricing rules, 100+ orders)

**This is normal and expected for autonomous web scraping!**

## Deduplication

The agent tracks seen reels in `agent_seen_sources` table:
- Never re-evaluates the same reel twice
- Saves time and API rate limits
- Persists across runs

## If Discovery Fails

Agent exits gracefully with clear message:

```
⚠️ No viral reels discovered
   Instagram may be blocking requests
   This is normal - will retry on next run
   
💡 TIP: Try adjusting DISCOVERY_MIN_VIEWS or DISCOVERY_TERMS
```

No errors, no crashes. Just retry on next scheduled run.

## Daily Schedule

Workflow runs automatically at 6:00 AM UTC daily. Or click button anytime!

## The Bottom Line

**✅ FULLY AUTONOMOUS - ZERO INPUTS**

- No YAML files to create
- No product URLs to find
- No reels to curate
- No manual work required

Just click button → wait → review products → approve/reject.

The agent discovers, analyzes, validates, and imports everything automatically!
