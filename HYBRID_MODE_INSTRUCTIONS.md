# Hybrid Mode - Updated Python Script Instructions

## What Changed

The Python script `scripts/revoa_import.py` has been updated to support **HYBRID MODE**.

### Key Changes:

1. **Fetches amazon_url and aliexpress_url from database** (lines 1309, 1337-1342)
2. **Checks for hybrid mode** - if all three are provided (reel URLs + Amazon URL + AliExpress URL), enters hybrid mode instead of autonomous mode
3. **Fixed URL regex** - now handles both `/reel/` and `/reels/` Instagram URL formats
4. **Hybrid mode processing** (lines 1364-1505):
   - Uses your exact Amazon and AliExpress URLs
   - Downloads the Instagram reel
   - Fetches prices from both URLs
   - Validates the spread
   - Creates the product
   - Skips autonomous discovery entirely

## For ChatGPT Agent

Add these lines to the agent's instructions:

```
When the user provides:
1. Instagram reel URL
2. Amazon product URL
3. AliExpress product URL

The import script will:
- Run in HYBRID MODE
- Use the exact URLs provided
- NOT search for products
- NOT run autonomous discovery
- Create a product with the specified URLs only
```

## Testing

The hybrid mode requires ALL THREE:
- ✅ reel_urls (Instagram URL)
- ✅ amazon_url
- ✅ aliexpress_url

If any are missing, it falls back to autonomous mode.

## Updated Script Location

The updated Python script is at: `/tmp/cc-agent/52284140/project/scripts/revoa_import.py`

You need to copy this file to your GitHub repository for GitHub Actions to use it.
