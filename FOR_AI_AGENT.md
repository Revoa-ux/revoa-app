# Instructions for AI Agent

## Your Mission

Import 3 pilot products into the Revoa platform to test the full import pipeline.

## What You Have

A ready-to-run Python script that:
- Automatically logs into the Revoa system
- Imports 3 pre-configured products
- Returns success/failure results

## Step-by-Step Instructions

### 1. Get the Script

The script is located at: `ai_agent_import.py`

You can either:
- **Option A**: Get the file from the project owner
- **Option B**: Copy the script contents below

<details>
<summary>Click to view full script</summary>

```python
#!/usr/bin/env python3
"""
AI Agent Product Import Script
This script automates product imports to Revoa platform with automatic login.
"""

import requests
import json
import datetime
import sys

# Configuration
SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw"

# Admin credentials - THESE ARE PRE-CONFIGURED
ADMIN_EMAIL = "tyler@revoa.app"
ADMIN_PASSWORD = "RevoaAI17"


def login_and_get_token(email, password):
    """Login to Supabase and return JWT access token"""
    print(f"🔐 Logging in as {email}...")
    
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        
        if "access_token" not in data:
            print(f"❌ Login failed: No access token in response")
            print(f"Response: {json.dumps(data, indent=2)}")
            return None
            
        print(f"✅ Login successful!")
        return data["access_token"]
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Login failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None


def import_products(token, products_data, source="ai_agent"):
    """Import products to Revoa platform"""
    print(f"\n📦 Importing {len(products_data)} products...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "source": source,
        "products": products_data
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/import-products",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        result = response.json()
        
        print(f"\n✅ Import completed!")
        print(f"   Total: {result.get('total', 0)}")
        print(f"   Successful: {result.get('successful', 0)}")
        print(f"   Failed: {result.get('failed', 0)}")
        
        if result.get('errors'):
            print(f"\n⚠️  Errors:")
            for error in result['errors']:
                print(f"   - {error.get('product', 'Unknown')}: {error.get('error', 'Unknown error')}")
        
        if result.get('product_ids'):
            print(f"\n📋 Product IDs created:")
            for pid in result['product_ids']:
                print(f"   - {pid}")
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Import failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None


def main():
    """Main execution function"""
    print("=" * 60)
    print("🤖 Revoa AI Agent - Product Import Tool")
    print("=" * 60)
    
    # Step 1: Login
    token = login_and_get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        print("\n❌ Failed to authenticate. Please check credentials.")
        sys.exit(1)
    
    # Step 2: Prepare products
    today = datetime.date.today().strftime("%Y%m%d")
    
    products = [
        {
            "external_id": f"ig:DLpBJg-s-_i:solar-step-lights:{today}",
            "name": "Peel-and-Stick Solar Step Lights (Warm White)",
            "category": "Lighting",
            "supplier_price": 9.80,
            "recommended_retail_price": round(9.80 * 3, 2),
            "description": "Boost curb appeal in minutes with weather-resistant solar step lights. Peel-and-stick or screw-mount, auto-on at dusk, no wiring.",
            "creatives": [
                {
                    "type": "reel",
                    "url": "https://www.instagram.com/reel/DLpBJg-s-_i/",
                    "platform": "instagram",
                    "is_inspiration": True
                }
            ],
            "metadata": {
                "price_rule_pass": True,
                "notes": "Pilot import; assets to follow. GIFs will be text-free."
            }
        },
        {
            "external_id": f"ig:DLxeJLpuUHd:under-door-draft-stopper:{today}",
            "name": "Under-Door Draft Stopper (Noise & Draft Seal)",
            "category": "Home",
            "supplier_price": 6.50,
            "recommended_retail_price": round(6.50 * 3, 2),
            "description": "Seal gaps to block drafts, dust, and noise. Cut-to-fit, easy install—comfort and energy savings year-round.",
            "creatives": [
                {
                    "type": "reel",
                    "url": "https://www.instagram.com/reel/DLxeJLpuUHd/",
                    "platform": "instagram",
                    "is_inspiration": True
                }
            ],
            "metadata": {
                "price_rule_pass": True,
                "notes": "Compact/light for dropshipping."
            }
        },
        {
            "external_id": f"ig:DMngbHWPjJP:resistance-bands-pro-set:{today}",
            "name": "Pro Resistance Bands Set (Door Anchor + Handles)",
            "category": "Fitness",
            "supplier_price": 11.00,
            "recommended_retail_price": round(11.00 * 3, 2),
            "description": "Full-body workouts anywhere. Stacked resistance, cushioned handles, and door anchor for hundreds of exercises.",
            "creatives": [
                {
                    "type": "reel",
                    "url": "https://www.instagram.com/reel/DMngbHWPjJP/",
                    "platform": "instagram",
                    "is_inspiration": True
                }
            ],
            "metadata": {
                "price_rule_pass": True,
                "notes": "Ships small; great margin potential."
            }
        }
    ]
    
    # Step 3: Import products
    result = import_products(token, products)
    
    if result and result.get('successful', 0) > 0:
        print(f"\n🎉 Success! Products are now pending approval.")
        print(f"📍 Review at: https://members.revoa.app/admin/products")
        print(f"\n💡 Next steps:")
        print(f"   1. Go to the admin panel")
        print(f"   2. Review the imported products")
        print(f"   3. Approve them to make visible to users")
    else:
        print(f"\n❌ Import failed or no products were imported.")
        sys.exit(1)
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
```

</details>

### 2. Run the Script

In your Python environment, simply run:

```bash
python ai_agent_import.py
```

**No changes needed** - all credentials are pre-configured!

### 3. What to Expect

You should see output like this:

```
============================================================
🤖 Revoa AI Agent - Product Import Tool
============================================================
🔐 Logging in as tyler@revoa.app...
✅ Login successful!

📦 Importing 3 products...

✅ Import completed!
   Total: 3
   Successful: 3
   Failed: 0

📋 Product IDs created:
   - abc123-def456-...
   - xyz789-uvw012-...
   - mno345-pqr678-...

🎉 Success! Products are now pending approval.
📍 Review at: https://members.revoa.app/admin/products
```

### 4. Report Back

After running, report these details to the project owner:

- ✅ **Success count**: How many products imported successfully
- ❌ **Error count**: How many failed (if any)
- 📋 **Product IDs**: List of UUIDs created
- 🔍 **Any errors**: Copy/paste error messages if imports failed

### 5. Next Steps (After Approval)

Once the project owner approves the products in the admin panel, you can:

1. **Upload Assets**
   - Download product images from Instagram reels
   - Upload to Supabase Storage bucket: `product-assets`
   - Update products with real image URLs

2. **Verify Pricing**
   - Check Amazon and AliExpress for actual supplier prices
   - Update `supplier_price` and `recommended_retail_price`
   - Add `amazon_url` and `aliexpress_url` to metadata

3. **Create Marketing Content**
   - Generate 3 text-free GIFs per product (1-5 seconds each)
   - Write ad copy variants
   - Create headline options

4. **Scale Up**
   - Import next batch of 5-10 products
   - Use same script, just modify the `products` array
   - Keep using `external_id` to prevent duplicates

## Product Data Format

Each product should follow this structure:

```python
{
    "external_id": "unique-identifier",  # Prevents duplicates
    "name": "Product Name",
    "category": "Category",  # e.g., "Lighting", "Home", "Fitness"
    "supplier_price": 9.99,
    "recommended_retail_price": 29.99,  # Usually 3x supplier price
    "description": "Product description...",
    "creatives": [
        {
            "type": "reel",  # or "ad", "static", "carousel"
            "url": "https://instagram.com/reel/...",
            "platform": "instagram",  # or "facebook", "tiktok", etc.
            "is_inspiration": True  # True for inspiration, False for ready-to-use
        }
    ],
    "metadata": {
        # Any custom fields you want to track
        "notes": "Additional info",
        "price_rule_pass": True
    }
}
```

## Common Issues

**Login fails with 400/401:**
- The admin account may not be set up yet
- Contact project owner to verify tyler@revoa.app exists

**Import fails with 403:**
- User doesn't have admin permissions
- Project owner needs to set `is_admin: true` in database

**Products don't appear:**
- They're created with `approval_status: "pending"`
- Only visible to admins until approved
- Check the admin panel at `/admin/products`

## Requirements

- Python 3.7+
- `requests` library: `pip install requests`

That's it! No other dependencies needed.

## Questions?

Contact the project owner or check the full documentation in `HOW_AI_AGENT_WORKS.md`.
