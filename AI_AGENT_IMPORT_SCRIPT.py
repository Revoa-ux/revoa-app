#!/usr/bin/env python3
"""
AI Agent Product Import Script for Bolt/Supabase
================================================

This script uploads product assets to Supabase storage and imports/updates
products via the Edge Function API with UPSERT support.

IMPORTANT CHANGES FROM ORIGINAL:
1. Uses mode="upsert" to update existing products instead of rejecting duplicates
2. Removes date suffix from external_id to enable proper updates
3. Fixed storage upload to use proper authentication
4. Supports both creating new products and updating existing ones
5. Uses urllib instead of requests (no external dependencies)

Usage:
    python AI_AGENT_IMPORT_SCRIPT.py
"""

import os
import json
import sys
from typing import List, Dict, Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urlencode
import mimetypes

# Configuration
SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw"
ADMIN_EMAIL = "tyler@revoa.app"
ADMIN_PASSWORD = "RevoaAI17"
TIMEOUT = 30

ASSETS_ROOT = "assets"


def login() -> str:
    """Authenticate and return access token."""
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    data = json.dumps({
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }).encode('utf-8')

    req = Request(url, data=data, headers=headers, method='POST')

    try:
        with urlopen(req, timeout=TIMEOUT) as response:
            result = json.loads(response.read().decode('utf-8'))
            token = result.get("access_token")
            if not token:
                raise RuntimeError("No access_token in login response")
            return token
    except HTTPError as e:
        error_body = e.read().decode('utf-8')
        raise RuntimeError(f"Login failed: {error_body}")


def upload_file(token: str, local_path: str, bucket_path: str) -> str:
    """Upload a file to Supabase storage and return public URL."""
    url = f"{SUPABASE_URL}/storage/v1/object/product-assets/{bucket_path}"

    # Read file
    with open(local_path, "rb") as f:
        file_data = f.read()

    # Detect content type
    content_type, _ = mimetypes.guess_type(local_path)
    if not content_type:
        content_type = "application/octet-stream"

    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": ANON_KEY,
        "Content-Type": content_type
    }

    req = Request(url, data=file_data, headers=headers, method='POST')

    try:
        with urlopen(req, timeout=TIMEOUT) as response:
            return f"{SUPABASE_URL}/storage/v1/object/public/product-assets/{bucket_path}"
    except HTTPError as e:
        error_body = e.read().decode('utf-8')
        # If file exists, return its public URL anyway
        if "already exists" in error_body.lower():
            return f"{SUPABASE_URL}/storage/v1/object/public/product-assets/{bucket_path}"
        raise RuntimeError(f"Upload failed for {local_path}: {error_body}")


def gather_files(folder: str) -> List[str]:
    """Gather all file paths in a folder relative to ASSETS_ROOT."""
    files = []
    folder_path = os.path.join(ASSETS_ROOT, folder)

    if not os.path.exists(folder_path):
        print(f"⚠️  Folder not found: {folder_path}")
        return files

    for root, _, filenames in os.walk(folder_path):
        for filename in filenames:
            full_path = os.path.join(root, filename)
            rel_path = os.path.relpath(full_path, ASSETS_ROOT).replace("\\", "/")
            files.append(rel_path)

    return files


def import_products(token: str, products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Import/update products via Edge Function with UPSERT mode."""
    url = f"{SUPABASE_URL}/functions/v1/import-products"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = json.dumps({
        "source": "ai_agent",
        "mode": "upsert",  # CRITICAL: Use upsert to update existing products
        "products": products
    }).encode('utf-8')

    req = Request(url, data=payload, headers=headers, method='POST')

    try:
        with urlopen(req, timeout=TIMEOUT) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            data = json.loads(error_body)
        except:
            data = {"status": e.code, "text": error_body}
        raise RuntimeError(f"Import failed: {json.dumps(data, indent=2)}")


def main():
    """Main execution flow."""
    print("🔐 Logging in...")
    token = login()
    print("✅ Logged in successfully\n")

    # Product mapping - FIXED: Removed date suffix from external_id
    mapping = [
        {
            "external_id": "ig:DLpBJg-s-_i:solar-step-lights",  # NO DATE SUFFIX
            "folder": "lighting/solar-step-lights",
            "name": "Solar Step Lights",
            "category": "Lighting",
            "description": "Boost curb appeal in minutes with weather-resistant solar step lights.",
            "supplier_price": 9.80,
            "recommended_retail_price": 29.40,
            "inspiration_reels": [
                "https://www.instagram.com/reel/DLpBJg-s-_i/"
            ]
        },
        {
            "external_id": "ig:DLxeJLpuUHd:under-door-draft-stopper",  # NO DATE SUFFIX
            "folder": "home/under-door-draft-stopper",
            "name": "Under Door Draft Stopper",
            "category": "Home",
            "description": "Seal drafts and cut noise with this easy-install door stopper.",
            "supplier_price": 8.50,
            "recommended_retail_price": 25.50,
            "inspiration_reels": [
                "https://www.instagram.com/reel/DLxeJLpuUHd/"
            ]
        },
        {
            "external_id": "ig:DMngbHWPjJP:resistance-bands-pro-set",  # NO DATE SUFFIX
            "folder": "fitness/resistance-bands",
            "name": "Resistance Bands Pro Set",
            "category": "Fitness",
            "description": "Train anywhere with this professional full-body resistance band set.",
            "supplier_price": 12.00,
            "recommended_retail_price": 36.00,
            "inspiration_reels": [
                "https://www.instagram.com/reel/DMngbHWPjJP/"
            ]
        }
    ]

    products = []

    for item in mapping:
        print(f"📦 Processing: {item['name']}")
        folder = item["folder"]

        # Gather and upload files
        file_list = gather_files(folder)
        if not file_list:
            print(f"   ⚠️  No files found, using inspiration reels only\n")
            # Still include product with just inspiration reels

        public_urls = []
        for rel_path in file_list:
            local_path = os.path.join(ASSETS_ROOT, rel_path)
            try:
                public_url = upload_file(token, local_path, rel_path)
                public_urls.append(public_url)
                print(f"   ✓ {os.path.basename(local_path)}")
            except Exception as e:
                print(f"   ✗ {os.path.basename(local_path)}: {e}")

        # Classify files by type
        def filter_urls(pattern: str) -> List[str]:
            return [u for u in public_urls if pattern in u.lower()]

        # Build images array
        images = []
        main_images = filter_urls("main.jpg")
        lifestyle_images = filter_urls("lifestyle")

        for idx, url in enumerate(main_images):
            images.append({
                "url": url,
                "type": "main",
                "display_order": 0
            })

        for idx, url in enumerate(lifestyle_images):
            images.append({
                "url": url,
                "type": "lifestyle",
                "display_order": idx + 1
            })

        # Build media array (videos)
        media = []
        video_urls = [*filter_urls(".mp4"), *filter_urls(".mov"), *filter_urls(".webm")]
        for url in video_urls:
            media.append({
                "url": url,
                "type": "video",
                "description": "Product demo"
            })

        # Build creatives array
        creatives = []

        # Add inspiration reels
        for reel_url in item["inspiration_reels"]:
            creatives.append({
                "type": "reel",
                "url": reel_url,
                "platform": "instagram",
                "is_inspiration": True
            })

        # Add GIFs as ad creatives (text-free only)
        gif_urls = filter_urls(".gif")
        for idx, url in enumerate(gif_urls, start=1):
            creatives.append({
                "type": "ad",
                "url": url,
                "platform": "meta",
                "headline": f"Shop {item['name']}",
                "ad_copy": "Fast & free shipping",
                "is_inspiration": False
            })

        # Build product object
        products.append({
            "external_id": item["external_id"],
            "name": item["name"],
            "description": item["description"],
            "category": item["category"],
            "supplier_price": item["supplier_price"],
            "recommended_retail_price": item["recommended_retail_price"],
            "images": images,
            "media": media,
            "creatives": creatives
        })

        print(f"   ✅ {len(images)} images, {len(media)} videos, {len(creatives)} creatives\n")

    if not products:
        print("❌ No products to import")
        return

    # Import products with UPSERT mode
    print(f"🔄 Importing {len(products)} products with UPSERT mode...")
    result = import_products(token, products)

    print("\n" + "="*60)
    print("IMPORT RESULTS")
    print("="*60)
    print(f"Total: {result['total']}")
    print(f"Successful: {result['successful']}")
    print(f"Failed: {result['failed']}")

    if result.get('errors'):
        print("\nErrors:")
        for error in result['errors']:
            print(f"  - {error['product']}: {error['error']}")

    print("\n✅ Import complete! Check the Product Approvals page in admin.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Import cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        sys.exit(1)
