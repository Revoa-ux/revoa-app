# Product Import API Documentation

## Overview

This API allows automated bulk import of products from AI agents or other systems. Products are imported in a pending state and require super admin approval before becoming visible to users.

## Endpoint

```
POST https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/import-products
```

**Full URL:** `https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/import-products`

## Authentication

Requires admin user authentication via Supabase JWT token.

**Headers:**
```
Authorization: Bearer <SUPABASE_JWT_TOKEN>
Content-Type: application/json
```

## Request Body

```typescript
{
  "source": "ai_agent" | "manual" | "csv" | "api",
  "products": [
    {
      "name": string,                          // Required
      "description": string,                   // Optional
      "category": string,                      // Required
      "supplier_price": number,               // Optional
      "recommended_retail_price": number,     // Optional
      "external_id": string,                  // Optional - for deduplication
      "metadata": object,                     // Optional

      "images": [                             // Optional
        {
          "url": string,                      // Required
          "type": "main" | "variant" | "lifestyle" | "detail",
          "display_order": number,            // Optional
          "alt_text": string                  // Optional
        }
      ],

      "media": [                              // Optional
        {
          "url": string,                      // Required
          "thumbnail_url": string,            // Optional
          "type": "gif" | "video" | "image",  // Required
          "description": string,              // Optional
          "duration_seconds": number          // Optional
        }
      ],

      "creatives": [                          // Optional
        {
          "type": "reel" | "ad" | "static" | "carousel",  // Required
          "url": string,                                   // Required
          "thumbnail_url": string,                         // Optional
          "platform": "facebook" | "instagram" | "tiktok" | "youtube" | "universal",
          "headline": string,                              // Optional
          "description": string,                           // Optional
          "ad_copy": string,                              // Optional
          "cta_text": string,                             // Optional
          "is_inspiration": boolean,                      // Optional - defaults to true
          "performance_score": number                     // Optional - 0.00 to 1.00
        }
      ],

      "variants": [                           // Optional
        {
          "name": string,                     // Required
          "sku": string,                      // Required
          "item_cost": number,                // Required
          "shipping_cost": number,            // Required
          "recommended_price": number,        // Required
          "images": string[]                  // Optional - array of URLs
        }
      ]
    }
  ]
}
```

## Response

### Success (200)
```json
{
  "total": 10,
  "successful": 8,
  "failed": 2,
  "product_ids": ["uuid1", "uuid2", ...],
  "errors": [
    {
      "product": "Product Name",
      "error": "Error description"
    }
  ]
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Missing Authorization header"
}
```

#### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

#### 400 Bad Request
```json
{
  "error": "Products array is required and must not be empty"
}
```

## Example Usage

### cURL Example

```bash
curl -X POST 'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/import-products' \\
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "source": "ai_agent",
  "products": [
    {
      "name": "Premium Wireless Earbuds",
      "description": "High-quality wireless earbuds with noise cancellation",
      "category": "Electronics",
      "supplier_price": 45.00,
      "recommended_retail_price": 89.99,
      "external_id": "prod_12345",
      "images": [
        {
          "url": "https://example.com/earbuds-main.jpg",
          "type": "main",
          "display_order": 0
        },
        {
          "url": "https://example.com/earbuds-lifestyle.jpg",
          "type": "lifestyle",
          "display_order": 1
        }
      ],
      "media": [
        {
          "url": "https://example.com/earbuds-demo.mp4",
          "thumbnail_url": "https://example.com/earbuds-thumb.jpg",
          "type": "video",
          "description": "Product demo video",
          "duration_seconds": 30
        }
      ],
      "creatives": [
        {
          "type": "reel",
          "url": "https://example.com/tiktok-reel.mp4",
          "thumbnail_url": "https://example.com/reel-thumb.jpg",
          "platform": "tiktok",
          "headline": "Game-Changing Sound Quality",
          "description": "Experience audio like never before",
          "ad_copy": "🎧 Crystal clear sound + 40hr battery life! Get yours now with 20% off!",
          "cta_text": "Shop Now",
          "is_inspiration": true
        },
        {
          "type": "ad",
          "url": "https://example.com/facebook-ad.jpg",
          "platform": "facebook",
          "headline": "Premium Audio, Affordable Price",
          "description": "Wireless earbuds that won't break the bank",
          "ad_copy": "Limited time offer! Save $20 on our best-selling wireless earbuds.",
          "cta_text": "Buy Now",
          "is_inspiration": false,
          "performance_score": 0.85
        }
      ],
      "variants": [
        {
          "name": "Black",
          "sku": "EARBUDS-BLK",
          "item_cost": 45.00,
          "shipping_cost": 5.00,
          "recommended_price": 89.99,
          "images": ["https://example.com/black-variant.jpg"]
        },
        {
          "name": "White",
          "sku": "EARBUDS-WHT",
          "item_cost": 45.00,
          "shipping_cost": 5.00,
          "recommended_price": 89.99,
          "images": ["https://example.com/white-variant.jpg"]
        }
      ]
    }
  ]
}'
```

### Python Example

```python
import requests
import json

SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co"
JWT_TOKEN = "your_jwt_token_here"

headers = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "source": "ai_agent",
    "products": [
        {
            "name": "Premium Wireless Earbuds",
            "description": "High-quality wireless earbuds with noise cancellation",
            "category": "Electronics",
            "supplier_price": 45.00,
            "recommended_retail_price": 89.99,
            "external_id": "prod_12345",
            "images": [
                {
                    "url": "https://example.com/earbuds-main.jpg",
                    "type": "main",
                    "display_order": 0
                }
            ],
            "creatives": [
                {
                    "type": "reel",
                    "url": "https://example.com/tiktok-reel.mp4",
                    "platform": "tiktok",
                    "headline": "Game-Changing Sound Quality",
                    "is_inspiration": True
                }
            ]
        }
    ]
}

response = requests.post(
    f"{SUPABASE_URL}/functions/v1/import-products",
    headers=headers,
    json=payload
)

print(response.status_code)
print(json.dumps(response.json(), indent=2))
```

### JavaScript/Node.js Example

```javascript
const SUPABASE_URL = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const JWT_TOKEN = 'your_jwt_token_here';

const payload = {
  source: 'ai_agent',
  products: [
    {
      name: 'Premium Wireless Earbuds',
      description: 'High-quality wireless earbuds with noise cancellation',
      category: 'Electronics',
      supplier_price: 45.00,
      recommended_retail_price: 89.99,
      external_id: 'prod_12345',
      images: [
        {
          url: 'https://example.com/earbuds-main.jpg',
          type: 'main',
          display_order: 0
        }
      ],
      creatives: [
        {
          type: 'reel',
          url: 'https://example.com/tiktok-reel.mp4',
          platform: 'tiktok',
          headline: 'Game-Changing Sound Quality',
          is_inspiration: true
        }
      ]
    }
  ]
};

const response = await fetch(`${SUPABASE_URL}/functions/v1/import-products`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const result = await response.json();
console.log(result);
```

## Approval Workflow

1. **Import**: Products are imported with `approval_status: 'pending'`
2. **Notification**: Super admins receive notifications about new products
3. **Review**: Super admins review products at `/admin/products`
4. **Approval**: Super admin approves or rejects products
5. **Visibility**: Only approved products are visible to regular users

## Important Notes

- **Deduplication**: Use `external_id` to prevent duplicate imports
- **Asset URLs**: All image and video URLs must be publicly accessible
- **Batch Size**: Recommended batch size is 50-100 products per request
- **Rate Limiting**: Consider implementing delays between large batches
- **Error Handling**: Check the `errors` array in the response for failed imports
- **Authentication**: JWT tokens expire; refresh them as needed

## Viewing Imported Products

Super admins can view and approve products at:
```
https://your-app.com/admin/products
```

Regular users can view approved products at:
```
https://your-app.com/products
```

## Support

For issues or questions, contact your development team.
