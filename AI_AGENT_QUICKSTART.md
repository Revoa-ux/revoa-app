# AI Agent Quick Start Guide

## 🔑 Step 1: Get Your API Key/Token

### Option A: Copy from Settings Page (EASIEST - 10 seconds) ⭐

1. Go to https://members.revoa.app
2. Log in with your admin account
3. Click **Settings** in the sidebar
4. Scroll down to the **Developer** section
5. Click the 👁️ (eye) icon to reveal your token
6. Click the 📋 (copy) icon to copy it

Done! That's it. Super simple.

**Note:** JWT tokens expire after some time. For long-term use, see Option B.

### Option B: Generate Long-Lived API Key (RECOMMENDED)

#### Step 1: Get Your Admin JWT (one time)
Follow Option A above to get your JWT token.

#### Step 2: Create API Key
```bash
curl -X POST \
  'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/api-keys/create' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_FROM_STEP_1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "AI Product Importer",
    "expiresInDays": 365
  }'
```

**Response:**
```json
{
  "success": true,
  "apiKey": "rva_a1b2c3d4e5f6...",
  "message": "IMPORTANT: Save this API key now!"
}
```

⚠️ **SAVE THE API KEY!** You can't see it again.

---

## 📤 Step 2: Import Products

**POST to this URL:**
```
https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/import-products
```

**Include your token in the Authorization header:**
```
Authorization: Bearer <YOUR_TOKEN_OR_API_KEY>
```

## Minimal Example

Here's the simplest working example:

```json
{
  "source": "ai_agent",
  "products": [
    {
      "name": "Wireless Earbuds",
      "category": "Electronics",
      "supplier_price": 45.00,
      "recommended_retail_price": 89.99,
      "description": "Premium wireless earbuds with noise cancellation",
      "images": [
        {
          "url": "https://example.com/image1.jpg",
          "type": "main"
        }
      ],
      "creatives": [
        {
          "type": "reel",
          "url": "https://example.com/video.mp4",
          "platform": "tiktok",
          "is_inspiration": true
        }
      ]
    }
  ]
}
```

## Full Example with All Fields

```json
{
  "source": "ai_agent",
  "products": [
    {
      "name": "Premium Wireless Earbuds",
      "description": "High-quality wireless earbuds with active noise cancellation",
      "category": "Electronics",
      "supplier_price": 45.00,
      "recommended_retail_price": 89.99,
      "external_id": "prod_12345",

      "images": [
        {
          "url": "https://example.com/main.jpg",
          "type": "main",
          "display_order": 0,
          "alt_text": "Black wireless earbuds"
        },
        {
          "url": "https://example.com/lifestyle.jpg",
          "type": "lifestyle",
          "display_order": 1
        }
      ],

      "media": [
        {
          "url": "https://example.com/demo.mp4",
          "thumbnail_url": "https://example.com/thumb.jpg",
          "type": "video",
          "description": "Product demo",
          "duration_seconds": 30
        }
      ],

      "creatives": [
        {
          "type": "reel",
          "url": "https://example.com/tiktok.mp4",
          "thumbnail_url": "https://example.com/tiktok-thumb.jpg",
          "platform": "tiktok",
          "headline": "Best Sound Quality Ever!",
          "description": "See why everyone loves these",
          "ad_copy": "🎧 40hr battery + noise cancellation! Limited offer!",
          "cta_text": "Shop Now",
          "is_inspiration": true
        },
        {
          "type": "ad",
          "url": "https://example.com/facebook-ad.jpg",
          "platform": "facebook",
          "headline": "Premium Audio, Affordable Price",
          "ad_copy": "Save $20 today only!",
          "is_inspiration": false,
          "performance_score": 0.85
        }
      ],

      "variants": [
        {
          "name": "Black",
          "sku": "WE-BLK",
          "item_cost": 45.00,
          "shipping_cost": 5.00,
          "recommended_price": 89.99,
          "images": ["https://example.com/black.jpg"]
        },
        {
          "name": "White",
          "sku": "WE-WHT",
          "item_cost": 45.00,
          "shipping_cost": 5.00,
          "recommended_price": 89.99,
          "images": ["https://example.com/white.jpg"]
        }
      ]
    }
  ]
}
```

## Python Script

```python
import requests

url = "https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/import-products"
token = "YOUR_ADMIN_JWT_TOKEN"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

data = {
    "source": "ai_agent",
    "products": [
        {
            "name": "Wireless Earbuds",
            "category": "Electronics",
            "supplier_price": 45.00,
            "recommended_retail_price": 89.99,
            "description": "Premium wireless earbuds",
            "images": [
                {"url": "https://example.com/image.jpg", "type": "main"}
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
    ]
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

## Response Format

```json
{
  "total": 1,
  "successful": 1,
  "failed": 0,
  "product_ids": ["uuid-here"],
  "errors": []
}
```

## Important Notes

1. **Approval Required**: All products start as "pending" and need super admin approval
2. **Deduplication**: Use `external_id` to prevent duplicates
3. **Asset URLs**: All image/video URLs must be publicly accessible
4. **Batch Size**: Recommend 50-100 products per request
5. **Required Fields**: `name`, `category` are minimum requirements
6. **is_inspiration**: Set to `true` for inspiration content, `false` for ready-to-use ads

## After Import

Super admins can approve products at:
```
https://members.revoa.app/admin/products
```

Once approved, products appear at:
```
https://members.revoa.app/products
```

Users can then click "Add to Store" to import to their Shopify store!

## Full Documentation

See `PRODUCT_IMPORT_API.md` for complete API reference.
