# AI Agent Quick Start - COMPLETE COPY-PASTE READY

## 🔑 Step 1: Get Your Token (10 seconds)

1. Go to https://members.revoa.app
2. Log in with admin account
3. Click **Settings** in sidebar
4. Scroll to **Developer** section
5. Click eye icon → Click copy icon

Done! Now go to Step 2.

---

## 🤖 Step 2: Give This EXACT Message to Your AI Agent

**Copy everything below this line and paste to your AI:**

---

I need you to upload product images and import products to my Revoa app.

**EXACT CREDENTIALS - USE THESE:**

```python
SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co"
ADMIN_TOKEN = "PASTE_YOUR_TOKEN_HERE"  # Replace with your actual token from Settings
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw"
```

**YOUR TASKS:**
1. Upload product images to storage
2. Import products with images and metadata

**EXACT CODE TEMPLATE:**

```python
import requests
import json

SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co"
ADMIN_TOKEN = "PASTE_YOUR_TOKEN_HERE"  # Replace this
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw"

# Step 1: Upload an image
def upload_image(file_path, filename):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        headers = {
            "Authorization": f"Bearer {ADMIN_TOKEN}",
            "apikey": ANON_KEY
        }
        response = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/product-assets/{filename}",
            files=files,
            headers=headers
        )
    return response.json()

# Step 2: Import products
def import_products(products_data):
    headers = {
        "Authorization": f"Bearer {ADMIN_TOKEN}",
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "source": "ai_agent",
        "products": products_data
    }

    response = requests.post(
        f"{SUPABASE_URL}/functions/v1/import-products",
        headers=headers,
        json=payload
    )
    return response.json()

# Example usage
product = {
    "name": "Premium Wireless Earbuds",
    "description": "High-quality wireless earbuds with active noise cancellation",
    "category": "Electronics",
    "supplier_price": 45.00,
    "recommended_retail_price": 89.99,
    "images": [
        {
            "url": "https://example.com/image.jpg",
            "type": "main"
        }
    ],
    "creatives": [
        {
            "type": "reel",
            "url": "https://example.com/video.mp4",
            "platform": "tiktok",
            "is_inspiration": True
        }
    ]
}

# Import the product
result = import_products([product])
print(json.dumps(result, indent=2))
```

**MINIMAL PRODUCT STRUCTURE (required fields only):**

```json
{
  "name": "Product Name",
  "category": "Electronics",
  "supplier_price": 45.00,
  "recommended_retail_price": 89.99
}
```

**FULL PRODUCT STRUCTURE (all optional fields):**

```json
{
  "name": "Product Name",
  "description": "Product description",
  "category": "Electronics",
  "supplier_price": 45.00,
  "recommended_retail_price": 89.99,
  "external_id": "unique-id-123",

  "images": [
    {
      "url": "https://example.com/image.jpg",
      "type": "main",
      "display_order": 0,
      "alt_text": "Product image"
    }
  ],

  "media": [
    {
      "url": "https://example.com/video.mp4",
      "thumbnail_url": "https://example.com/thumb.jpg",
      "type": "video",
      "description": "Demo video",
      "duration_seconds": 30
    }
  ],

  "creatives": [
    {
      "type": "reel",
      "url": "https://example.com/tiktok.mp4",
      "thumbnail_url": "https://example.com/thumb.jpg",
      "platform": "tiktok",
      "headline": "Amazing Product!",
      "description": "Check this out",
      "ad_copy": "Limited time offer!",
      "cta_text": "Shop Now",
      "is_inspiration": true,
      "performance_score": 0.85
    }
  ],

  "variants": [
    {
      "name": "Black",
      "sku": "SKU-001",
      "item_cost": 45.00,
      "shipping_cost": 5.00,
      "recommended_price": 89.99,
      "images": ["https://example.com/black.jpg"]
    }
  ]
}
```

**IMPORTANT RULES:**
- DO NOT change SUPABASE_URL
- DO NOT change ANON_KEY
- Only replace ADMIN_TOKEN with the actual token
- All image/video URLs must be publicly accessible
- Products require super admin approval before users can see them
- Use external_id to prevent duplicate imports
- Set is_inspiration: true for inspiration content, false for ready-to-use ads

**STORAGE ENDPOINTS:**
- Upload images: `{SUPABASE_URL}/storage/v1/object/product-assets/{filename}`
- Import products: `{SUPABASE_URL}/functions/v1/import-products`

**APPROVAL PROCESS:**
After import, super admins approve at: https://members.revoa.app/admin/products
Once approved, users see products at: https://members.revoa.app/products

---

**End of message for AI agent**

---

## Alternative: Long-Lived API Keys (Optional)

If you want a key that lasts longer than the JWT token:

```bash
curl -X POST \
  'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/api-keys/create' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "AI Product Importer",
    "expiresInDays": 365
  }'
```

Save the API key from the response and use it instead of the JWT token.

---

## Full Documentation

See `PRODUCT_IMPORT_API.md` for complete API reference with all fields and examples.
