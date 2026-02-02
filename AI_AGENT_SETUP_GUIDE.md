# AI Agent Setup Guide - Complete Instructions

## 1. Asset Hosting Setup ✅

### Supabase Storage Bucket
Your product assets (images, videos, GIFs) should be uploaded to:

**Bucket Name:** `product-assets`

**Storage URL Format:**
```
https://0ec90b57d6e95fcbda19832f.supabase.co/storage/v1/object/public/product-assets/{filename}
```

### Supported File Types
- **Images:** JPG, PNG, GIF, WEBP
- **Videos:** MP4, WEBM, MOV
- **Max File Size:** 50MB per file

### Upload Method (Python Example)

```python
import requests
from supabase import create_client, Client

# Initialize Supabase client
SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co"
SUPABASE_KEY = "YOUR_ADMIN_JWT_TOKEN"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Upload a file
with open('product-image.jpg', 'rb') as f:
    response = supabase.storage.from_('product-assets').upload(
        'products/image-123.jpg',  # path in bucket
        f,
        file_options={"content-type": "image/jpeg"}
    )

# Get public URL
public_url = f"{SUPABASE_URL}/storage/v1/object/public/product-assets/products/image-123.jpg"
```

### Direct HTTP Upload (cURL)

```bash
curl -X POST \
  'https://0ec90b57d6e95fcbda19832f.supabase.co/storage/v1/object/product-assets/products/image-123.jpg' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN' \
  -H 'Content-Type: image/jpeg' \
  --data-binary '@product-image.jpg'
```

### Recommended Folder Structure

```
product-assets/
├── products/
│   ├── images/
│   │   ├── product-123-main.jpg
│   │   ├── product-123-lifestyle.jpg
│   │   └── product-456-main.png
│   ├── videos/
│   │   ├── product-123-demo.mp4
│   │   └── product-456-unboxing.mp4
│   └── gifs/
│       ├── product-123-animation.gif
│       └── product-456-feature.gif
└── creatives/
    ├── tiktok/
    │   ├── reel-001.mp4
    │   └── reel-002.mp4
    ├── facebook/
    │   ├── ad-001.jpg
    │   └── ad-002.mp4
    └── instagram/
        ├── post-001.jpg
        └── story-001.mp4
```

---

## 2. Admin JWT Token

### How to Get Your Admin JWT Token

**Option 1: Via Frontend (Easiest)**
1. Log in to https://members.revoa.app with your admin account
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run this command:
   ```javascript
   (await supabase.auth.getSession()).data.session.access_token
   ```
5. Copy the token (starts with `eyJ...`)

**Option 2: Via Supabase Dashboard**
1. Go to Supabase Dashboard
2. Navigate to Authentication → Users
3. Find your admin user
4. Copy the JWT token from user details

### Admin User Credentials
You'll need to create or identify an admin user with:
- `is_admin = true` in the `user_profiles` table

### Token Security
- **Never commit tokens to Git**
- **Store securely in environment variables**
- **Tokens expire - you may need to refresh periodically**

---

## 3. Product Import API

### Endpoint
```
POST https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/import-products
```

### Complete Python Integration Example

```python
import requests
import os
from typing import List, Dict, Optional

class RevoaProductImporter:
    def __init__(self, admin_jwt: str):
        self.base_url = "https://0ec90b57d6e95fcbda19832f.supabase.co"
        self.jwt = admin_jwt
        self.headers = {
            "Authorization": f"Bearer {admin_jwt}",
            "Content-Type": "application/json"
        }

    def upload_asset(self, file_path: str, destination: str) -> str:
        """Upload an asset to Supabase Storage and return the public URL"""
        with open(file_path, 'rb') as f:
            upload_url = f"{self.base_url}/storage/v1/object/product-assets/{destination}"

            # Determine content type
            content_type = "image/jpeg"
            if file_path.endswith('.png'):
                content_type = "image/png"
            elif file_path.endswith('.gif'):
                content_type = "image/gif"
            elif file_path.endswith('.mp4'):
                content_type = "video/mp4"
            elif file_path.endswith('.webp'):
                content_type = "image/webp"

            response = requests.post(
                upload_url,
                headers={
                    "Authorization": f"Bearer {self.jwt}",
                    "Content-Type": content_type
                },
                data=f.read()
            )

            if response.ok:
                return f"{self.base_url}/storage/v1/object/public/product-assets/{destination}"
            else:
                raise Exception(f"Upload failed: {response.text}")

    def import_products(self, products: List[Dict]) -> Dict:
        """Import products to Revoa platform"""
        payload = {
            "source": "ai_agent",
            "products": products
        }

        response = requests.post(
            f"{self.base_url}/functions/v1/import-products",
            headers=self.headers,
            json=payload
        )

        if response.ok:
            return response.json()
        else:
            raise Exception(f"Import failed: {response.text}")

# Usage Example
def main():
    # Initialize importer
    jwt_token = os.getenv("REVOA_ADMIN_JWT")
    importer = RevoaProductImporter(jwt_token)

    # Upload assets first
    main_image_url = importer.upload_asset(
        "local-image.jpg",
        "products/images/wireless-earbuds-main.jpg"
    )

    tiktok_video_url = importer.upload_asset(
        "tiktok-reel.mp4",
        "creatives/tiktok/earbuds-promo.mp4"
    )

    # Import product with hosted assets
    products = [
        {
            "name": "Premium Wireless Earbuds",
            "description": "High-quality wireless earbuds with noise cancellation",
            "category": "Electronics",
            "supplier_price": 45.00,
            "recommended_retail_price": 89.99,
            "images": [
                {
                    "url": main_image_url,
                    "type": "main",
                    "display_order": 0
                }
            ],
            "creatives": [
                {
                    "type": "reel",
                    "url": tiktok_video_url,
                    "platform": "tiktok",
                    "headline": "Best Sound Quality Ever!",
                    "is_inspiration": True
                }
            ]
        }
    ]

    result = importer.import_products(products)
    print(f"Imported {result['successful']} products successfully!")

if __name__ == "__main__":
    main()
```

---

## 4. Workflow Summary

### Complete AI Agent Workflow

1. **Scrape/Generate Product Data**
   - Product details (name, description, price, etc.)
   - Download product images and videos locally

2. **Upload Assets to Supabase Storage**
   - Upload all images to `product-assets/products/images/`
   - Upload all videos to `product-assets/products/videos/`
   - Upload all GIFs to `product-assets/products/gifs/`
   - Upload creative content to `product-assets/creatives/`
   - Store the returned public URLs

3. **Build Product Payload**
   - Use the public URLs from step 2
   - Structure according to API documentation

4. **Import Products**
   - POST to import endpoint with product data
   - Products will be in "pending" status

5. **Admin Approves**
   - Super admins review at `/admin/products`
   - Approve good products
   - Once approved, products appear in user catalog

6. **Users Import to Shopify**
   - Users browse products at `/products`
   - Click "Add to Store"
   - Product automatically added to their Shopify store

---

## 5. Testing Checklist

- [ ] Admin JWT token works (test with simple API call)
- [ ] Can upload images to `product-assets` bucket
- [ ] Uploaded images are publicly accessible via URL
- [ ] Can import products via API endpoint
- [ ] Products appear in admin approval queue
- [ ] Can approve products in admin panel
- [ ] Approved products appear in user product catalog

---

## 6. Rate Limits & Best Practices

### Recommendations
- **Batch Size:** 25-50 products per request
- **Rate Limiting:** Max 1 request per second
- **Asset Optimization:**
  - Images: < 2MB, optimized for web
  - Videos: < 20MB, compressed
  - Use WebP for images when possible
  - Use descriptive filenames (easier to manage)

### Error Handling
```python
try:
    result = importer.import_products(products)
    print(f"Success: {result['successful']}/{result['total']}")
    if result['failed'] > 0:
        print(f"Errors: {result['errors']}")
except Exception as e:
    print(f"Import failed: {e}")
    # Log and retry
```

---

## 7. Support & Questions

If you need:
- Admin JWT token → Let me know when you're ready
- Storage permissions issues → I'll adjust RLS policies
- API questions → Check `PRODUCT_IMPORT_API.md` for full spec
- Testing assistance → I can approve test imports

Ready to start? Just let me know when you need the admin JWT token!
