# ⚠️ CRITICAL: What the "AI Agent" Actually Does

The agent is **NOT discovering products automatically**. It's a semi-automated import tool.

## Why Your Run Failed

All products in `pilot.yml` have FAKE Amazon URLs:

```
amazon_url: "https://www.amazon.com/dp/EXAMPLE1"  ❌
amazon_url: "https://www.amazon.com/dp/EXAMPLE2"  ❌  
amazon_url: "https://www.amazon.com/dp/EXAMPLE3"  ❌
```

Result: "Amazon (Prime) price not found" - because these products don't exist!

## The Real Workflow

1. **YOU** manually find viral Instagram reels
2. **YOU** identify the products shown
3. **YOU** find the Amazon product pages
4. **YOU** create YAML files with real URLs
5. **AGENT** validates pricing and generates GIFs
6. **YOU** review and approve products

## How to Fix It

Replace fake URLs in `products/pilot.yml` with REAL Amazon products:

```yaml
# BEFORE (fails)
amazon_url: "https://www.amazon.com/dp/EXAMPLE1"

# AFTER (works)
amazon_url: "https://www.amazon.com/dp/B0BN5SPZKH"  # Real product
```

Then run the agent again.

## What the Agent Actually Does

✅ Scrapes Amazon prices (you provide URL)
✅ Searches AliExpress suppliers
✅ Downloads Instagram reels (you provide URL)
✅ Generates text-free GIFs
✅ Validates pricing rules
✅ Imports products to database

❌ Does NOT discover reels automatically
❌ Does NOT identify products from videos
❌ Does NOT find Amazon listings automatically

The agent is a **tool that automates the tedious parts**, not a fully autonomous AI.
