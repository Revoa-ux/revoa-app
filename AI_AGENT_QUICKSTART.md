# AI Agent Quick Start - ZERO MANUAL STEPS

## 📦 Asset Hosting: TWO OPTIONS

### Option A: Upload to Supabase (Recommended)
Upload local files to Supabase Storage bucket `product-assets` using the `upload_image()` function. It returns the public URL automatically.

### Option B: Use External URLs
If you already have images/videos hosted elsewhere (e.g., your own CDN), just use those URLs directly in the product data.

**No other setup needed - both options work out of the box!**

---

## 🤖 Option 1: Fully Automated (Recommended)

Just copy this ENTIRE message and paste to your AI agent:

---

I need you to import products to my Revoa app. You'll need to log in first to get the auth token.

**Asset Hosting:** All images/GIFs/videos are uploaded to the Supabase Storage bucket `product-assets`. Use the `upload_image()` function below to upload any local files. The function returns the public URL to use in product data.

**Login to get token automatically:**

```python
import requests
import json

# Step 1: Login to get auth token
def login_and_get_token(email, password):
    """Login and return auth token"""
    url = "https://0ec90b57d6e95fcbda19832f.supabase.co/auth/v1/token?grant_type=password"
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw",
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}
    response = requests.post(url, headers=headers, json=payload)
    data = response.json()
    return data["access_token"]

# Your admin credentials
ADMIN_EMAIL = "your-email@example.com"  # REPLACE THIS
ADMIN_PASSWORD = "your-password"  # REPLACE THIS

# Get token automatically
ADMIN_TOKEN = login_and_get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
print(f"✓ Logged in successfully!")

# Now use the token for all operations
SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw"

# Upload image/video to Supabase Storage
def upload_image(file_path, filename):
    """Upload a file and return its public URL"""
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
        result = response.json()
        if response.status_code == 200:
            # Return the public URL
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/product-assets/{filename}"
            print(f"✓ Uploaded: {public_url}")
            return public_url
        else:
            print(f"✗ Upload failed: {result}")
            return None

# Import products function
def import_products(products_data):
    headers = {
        "Authorization": f"Bearer {ADMIN_TOKEN}",
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {"source": "ai_agent", "products": products_data}
    response = requests.post(
        f"{SUPABASE_URL}/functions/v1/import-products",
        headers=headers,
        json=payload
    )
    return response.json()

# EXAMPLE WORKFLOW: Upload images then import product

# Step 1: Upload local images/videos to get URLs
main_image_url = upload_image("earbuds-main.jpg", "earbuds-main.jpg")
video_url = upload_image("earbuds-demo.mp4", "earbuds-demo.mp4")

# Step 2: Create product with the uploaded URLs
product = {
    "name": "Premium Wireless Earbuds",
    "description": "High-quality wireless earbuds with noise cancellation",
    "category": "Electronics",
    "supplier_price": 45.00,
    "recommended_retail_price": 89.99,
    "images": [
        {
            "url": main_image_url,  # Use uploaded URL
            "type": "main",
            "display_order": 0
        }
    ],
    "creatives": [
        {
            "type": "reel",
            "url": video_url,  # Use uploaded URL
            "platform": "tiktok",
            "is_inspiration": True,
            "description": "Product demo video"
        }
    ]
}

# Step 3: Import the product
result = import_products([product])
print(json.dumps(result, indent=2))
```

**Just replace these 2 lines with your admin credentials:**
- `ADMIN_EMAIL = "your-email@example.com"`
- `ADMIN_PASSWORD = "your-password"`

Everything else is automatic!

---

## 🔑 Option 2: Manual Token (if you prefer)

### Step 1: Get Your Token (10 seconds)

1. Go to https://members.revoa.app
2. Log in with admin account
3. Click **Settings** in sidebar
4. Scroll to **Developer** section
5. Click eye icon → Click copy icon

### Step 2: Use This Code

```python
import requests
import json

SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co"
ADMIN_TOKEN = "PASTE_YOUR_TOKEN_HERE"  # Replace with copied token
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw"

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

def import_products(products_data):
    headers = {
        "Authorization": f"Bearer {ADMIN_TOKEN}",
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {"source": "ai_agent", "products": products_data}
    response = requests.post(
        f"{SUPABASE_URL}/functions/v1/import-products",
        headers=headers,
        json=payload
    )
    return response.json()
```

---

## 📦 Product Structure

**MINIMAL (required only):**
```json
{
  "name": "Product Name",
  "category": "Electronics",
  "supplier_price": 45.00,
  "recommended_retail_price": 89.99
}
```

**FULL (all fields):**
```json
{
  "name": "Product Name",
  "description": "Description here",
  "category": "Electronics",
  "supplier_price": 45.00,
  "recommended_retail_price": 89.99,
  "external_id": "unique-id",
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "type": "main",
      "display_order": 0,
      "alt_text": "Alt text"
    }
  ],
  "media": [
    {
      "url": "https://example.com/video.mp4",
      "thumbnail_url": "https://example.com/thumb.jpg",
      "type": "video",
      "description": "Video description",
      "duration_seconds": 30
    }
  ],
  "creatives": [
    {
      "type": "reel",
      "url": "https://example.com/tiktok.mp4",
      "thumbnail_url": "https://example.com/thumb.jpg",
      "platform": "tiktok",
      "headline": "Headline text",
      "description": "Description",
      "ad_copy": "Ad copy text",
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

---

## 🎯 Important Rules

- Products require super admin approval before users see them
- Use `external_id` to prevent duplicate imports
- All image/video URLs must be publicly accessible
- Set `is_inspiration: true` for inspiration content
- Set `is_inspiration: false` for ready-to-use ads

---

## 🔗 After Import

**Approve products:** https://members.revoa.app/admin/products
**View products:** https://members.revoa.app/products

---

## 📚 Full Documentation

See `PRODUCT_IMPORT_API.md` for complete reference.

---

## ❓ Common Questions

**Q: Where do I put images/videos?**
A: Either upload to Supabase using `upload_image()` function, or use external URLs you already have.

**Q: What file types are supported?**
A: Images (JPG, PNG, GIF, WebP) and Videos (MP4, MOV, WebM) - any web-compatible format.

**Q: Do I need to set up hosting?**
A: No! The `product-assets` bucket is already configured and ready to use.

**Q: Can I use images from other websites?**
A: Yes, as long as the URLs are publicly accessible. But uploading to Supabase is more reliable.

**Q: How do I organize files in the bucket?**
A: Use folders in filenames like `"electronics/earbuds-main.jpg"` - the storage handles it automatically.
