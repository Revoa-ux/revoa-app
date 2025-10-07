#!/usr/bin/env python3
"""
Revoa AI Agent Product Import Script (Price-First + UPSERT)
===========================================================

Price-first workflow:
1. Checks Amazon (Prime-only) and AliExpress (top 3, with shipping, min sales)
2. Enforces pricing rule: AE ≤ 50% of Amazon OR spread ≥ $20
3. Only uploads assets AFTER pricing passes
4. UPSERT mode to update existing products

Requirements:
- Python 3.7+
- requests, pyyaml libraries: pip install requests pyyaml

Environment variables (set in Bolt Project Settings → Environment):
- SUPABASE_URL
- SUPABASE_ANON_KEY
- REVOA_ADMIN_TOKEN (or REVOA_ADMIN_EMAIL + REVOA_ADMIN_PASSWORD)

Usage:
    python3 scripts/revoa_import.py
"""

import os
import sys
import json
import pathlib
import re
from typing import List, Dict, Any, Tuple, Optional
from urllib.parse import urlparse

try:
    import requests
    import yaml
except ImportError:
    print("❌ Missing dependencies. Install with: pip install requests pyyaml")
    sys.exit(1)

# ---- Configuration ----
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
ADMIN_TOKEN = os.environ.get("REVOA_ADMIN_TOKEN")
ADMIN_EMAIL = os.environ.get("REVOA_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("REVOA_ADMIN_PASSWORD")

TIMEOUT = 30
PRICE_TIMEOUT = 25
HEADERS_BROWSER = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}


# ---------- Authentication ----------
def login() -> str:
    """Authenticate and return access token."""
    if ADMIN_TOKEN:
        print("🔑 Using admin token")
        return ADMIN_TOKEN

    if not (ADMIN_EMAIL and ADMIN_PASSWORD):
        raise RuntimeError("Missing REVOA_ADMIN_TOKEN or REVOA_ADMIN_EMAIL/REVOA_ADMIN_PASSWORD")

    print("🔐 Logging in via password grant…")
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    r = requests.post(
        url,
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=TIMEOUT
    )
    r.raise_for_status()
    data = r.json()
    tok = data.get("access_token")
    if not tok:
        raise RuntimeError(f"No access_token in login response: {data}")
    return tok


# ---------- Storage Upload ----------
def upload(token: str, local_path: str, bucket_rel_path: str) -> str:
    """Upload file to Supabase storage and return public URL."""
    with open(local_path, "rb") as f:
        file_data = f.read()

    url = f"{SUPABASE_URL}/storage/v1/object/product-assets/{bucket_rel_path}"
    r = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": ANON_KEY,
            "Content-Type": "application/octet-stream"
        },
        data=file_data,
        timeout=TIMEOUT
    )

    if r.status_code not in (200, 201):
        try:
            detail = r.json()
        except:
            detail = r.text
        # If file exists, that's OK - return the public URL anyway
        if "already exists" not in str(detail).lower():
            print(f"⚠️ Upload warning for {local_path}: {detail}")

    return f"{SUPABASE_URL}/storage/v1/object/public/product-assets/{bucket_rel_path}"


def collect_and_upload(token: str, assets_dir: str) -> Dict[str, List[str]]:
    """Collect and upload all assets from directory."""
    urls = {"images": [], "gifs": [], "videos": []}
    base = pathlib.Path(assets_dir)

    if not base.exists():
        print(f"⚠️ Missing assets dir: {assets_dir}")
        return urls

    for p in base.rglob("*"):
        if not p.is_file():
            continue

        rel = str(p).replace("\\", "/")
        bucket_rel = rel.replace("assets/", "")

        try:
            public = upload(token, str(p), bucket_rel)
            name = p.name.lower()

            if name.endswith((".jpg", ".jpeg", ".png", ".webp")):
                urls["images"].append(public)
            elif name.endswith(".gif"):
                urls["gifs"].append(public)
            elif name.endswith((".mp4", ".mov", ".webm")):
                urls["videos"].append(public)

            print(f"   ✓ {p.name}")
        except Exception as e:
            print(f"   ✗ {p.name}: {e}")

    return urls


# ---------- Price Helpers ----------
def _num(s: Optional[str]) -> Optional[float]:
    """Extract first number from string."""
    if not s:
        return None
    s = s.replace(",", "").replace("US$", "$").replace("CA$", "$").strip()
    m = re.search(r"(\d+(?:\.\d{1,2})?)", s)
    return float(m.group(1)) if m else None


def fetch_html(url: str) -> Optional[str]:
    """Fetch HTML content from URL."""
    try:
        r = requests.get(url, headers=HEADERS_BROWSER, timeout=PRICE_TIMEOUT, allow_redirects=True)
        if r.status_code == 200:
            return r.text
    except requests.RequestException as e:
        print(f"   ⚠️ Fetch error for {url}: {e}")
    return None


def parse_amazon_prime_price(html: str) -> Tuple[Optional[float], bool]:
    """Parse Amazon price and Prime status."""
    if not html:
        return None, False

    # Check for Prime
    prime = bool(re.search(r'Prime[^<]*</span>|aria-label="Prime"|amazon-prime', html, re.IGNORECASE))

    # Try multiple price selectors
    price = None
    patterns = [
        r'id="priceblock_ourprice"[^>]*>.*?\$?([0-9,]+\.[0-9]{2})',
        r'class="a-offscreen"[^>]*>.*?\$?([0-9,]+\.[0-9]{2})',
        r'<span class="a-price-whole">([0-9,]+)</span>',
        r'"price":\s*"?\$?([0-9,]+\.[0-9]{2})"?',
    ]

    for pattern in patterns:
        m = re.search(pattern, html)
        if m:
            price = _num(m.group(1))
            if price:
                break

    return price, prime


def parse_aliexpress_price_shipping_sales(html: str) -> Tuple[Optional[float], Optional[float], Optional[int]]:
    """Parse AliExpress price, shipping cost, and sales count."""
    if not html:
        return None, None, None

    # Price
    price = None
    price_patterns = [
        r'"salePrice"\s*:\s*"(.*?)"',
        r'"price"\s*:\s*"(.*?)"',
        r'>(US)?\s?\$?\s?(\d{1,4}(?:\.\d{1,2})?)\s*(USD|</)',
    ]
    for pattern in price_patterns:
        m = re.search(pattern, html, re.IGNORECASE)
        if m:
            price = _num(m.group(1) if m.lastindex and m.lastindex == 1 else (m.group(2) if m.lastindex else None))
            if price:
                break

    # Shipping
    ship = None
    ship_patterns = [
        r'"shippingFee"\s*:\s*"(.*?)"',
        r'shipping[^<]*\$?\s?(\d{1,4}(?:\.\d{1,2})?)',
    ]
    for pattern in ship_patterns:
        sm = re.search(pattern, html, re.IGNORECASE)
        if sm:
            ship = _num(sm.group(1))
            break

    if ship is None:
        ship = 0.0  # Treat missing as free

    # Sales count
    sales = None
    sales_patterns = [
        r'"tradeCount"\s*:\s*"?(\d+)"?',
        r'orders?[^0-9]*([0-9,]+)',
    ]
    for pattern in sales_patterns:
        sm = re.search(pattern, html, re.IGNORECASE)
        if sm:
            sales = int(sm.group(1).replace(",", ""))
            break

    return price, ship, sales


def fetch_amazon_price_prime_only(amazon_url: str) -> Optional[float]:
    """Fetch Amazon price, require Prime."""
    print(f"   📦 Checking Amazon (Prime-only)…")
    html = fetch_html(amazon_url)
    price, is_prime = parse_amazon_prime_price(html)

    if not is_prime:
        print(f"   ⚠️ Not Prime eligible")
        return None

    if price is None:
        print(f"   ⚠️ Could not parse price")
        return None

    print(f"   ✓ Amazon Prime: ${price:.2f}")
    return price


def fetch_aliexpress_total_best(candidate_urls: List[str], min_sales: int = 300, top_n: int = 3) -> Tuple[Optional[float], Optional[str]]:
    """
    Fetch best AliExpress total (item + shipping) from top candidates.
    Returns (best_total, best_url).
    """
    print(f"   🔍 Checking top {top_n} AliExpress candidates (min {min_sales} sales)…")
    results = []

    for i, u in enumerate(candidate_urls[:top_n], 1):
        html = fetch_html(u)
        price, ship, sales = parse_aliexpress_price_shipping_sales(html)

        print(f"   #{i}: ", end="")

        if price is None:
            print("❌ No price found")
            continue

        if sales is None or sales < min_sales:
            print(f"❌ Low sales ({sales or 0} < {min_sales})")
            continue

        total = float(price) + float(ship or 0.0)
        print(f"✓ ${price:.2f} + ${ship:.2f} shipping = ${total:.2f} ({sales} sales)")
        results.append((total, u))

    if not results:
        print(f"   ⚠️ No valid AliExpress candidates found")
        return None, None

    results.sort(key=lambda x: x[0])
    best = results[0]
    print(f"   🏆 Best: ${best[0]:.2f}")
    return best


def enforce_rule(ae_total: Optional[float], amz_total: Optional[float], min_spread: float = 20.0) -> Tuple[bool, str]:
    """
    Enforce pricing rule: AE ≤ 50% of Amazon OR spread ≥ $20.
    Returns (pass, reason).
    """
    if ae_total is None:
        return False, "AliExpress price not found"
    if amz_total is None:
        return False, "Amazon (Prime) price not found"

    spread = amz_total - ae_total
    half_rule = ae_total <= (amz_total * 0.50)
    spread_rule = spread >= min_spread

    if half_rule or spread_rule:
        return True, f"PASS (AE ${ae_total:.2f} vs AMZ ${amz_total:.2f}; spread ${spread:.2f})"

    return False, f"FAIL (AE ${ae_total:.2f} vs AMZ ${amz_total:.2f}; spread ${spread:.2f})"


# ---------- Build Product ----------
def build_product(
    rec: Dict[str, Any],
    assets: Dict[str, List[str]],
    ae_total: float,
    amz_total: float,
    pass_reason: str,
    best_ae_url: str
) -> Dict[str, Any]:
    """Build product payload for import."""
    # Images
    images = []
    mains = [u for u in assets["images"] if u.endswith("main.jpg")]
    lifestyles = [u for u in assets["images"] if "lifestyle" in u]

    if mains:
        images.append({"url": mains[0], "type": "main", "display_order": 0})
        for i, u in enumerate(sorted(lifestyles), start=1):
            images.append({"url": u, "type": "lifestyle", "display_order": i})

    # Media (videos)
    media = [{"url": u, "type": "video", "description": "Product demo"} for u in assets["videos"]]

    # Creatives
    creatives = []

    # Add inspiration reels
    for reel in rec.get("inspiration_reels", []):
        creatives.append({
            "type": "reel",
            "url": reel,
            "platform": "instagram",
            "is_inspiration": True
        })

    # Add GIFs as ad creatives
    for u in sorted(assets["gifs"]):
        creatives.append({
            "type": "ad",
            "url": u,
            "platform": "meta",
            "headline": rec.get("headline", "Shop Now"),
            "ad_copy": rec.get("ad_copy", "(fast & free shipping)"),
            "is_inspiration": False
        })

    # Calculate RRP = 3x supplier price
    rrp = round(ae_total * 3, 2)

    return {
        "external_id": rec["external_id"],
        "name": rec["name"],
        "description": rec["description"],
        "category": rec["category"],
        "supplier_price": ae_total,
        "recommended_retail_price": rrp,
        "images": images,
        "media": media,
        "creatives": creatives,
        "metadata": {
            "price_rule_pass": True,
            "price_rule_reason": pass_reason,
            "amazon_url": rec.get("amazon_url"),
            "aliexpress_url": best_ae_url,
            "amz_total": amz_total,
            "ae_total": ae_total,
            "notes": "GIFs must be text-free; uploaded after pricing pass."
        }
    }


# ---------- Import ----------
def import_products(token: str, products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Import products via Edge Function with UPSERT mode."""
    url = f"{SUPABASE_URL}/functions/v1/import-products"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "source": "ai_agent",
        "mode": "upsert",
        "products": products
    }

    r = requests.post(url, headers=headers, json=payload, timeout=TIMEOUT)

    try:
        data = r.json()
    except:
        data = {"status": r.status_code, "text": r.text}

    if not r.ok:
        raise RuntimeError(json.dumps(data, indent=2))

    return data


# ---------- Load Manifests ----------
def load_manifests() -> List[Dict[str, Any]]:
    """Load all product specifications from YAML files."""
    specs = []
    root = pathlib.Path("products")

    if not root.exists():
        print("ℹ️ No /products directory found")
        return specs

    for yaml_file in root.glob("*.yml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as f:
                doc = yaml.safe_load(f)
            products = doc.get("products", [])
            specs.extend(products)
            print(f"📄 Loaded {len(products)} product(s) from {yaml_file.name}")
        except Exception as e:
            print(f"⚠️ Error loading {yaml_file.name}: {e}")

    return specs


# ---------- Main ----------
def main():
    """Main execution flow."""
    print("🚀 Revoa Importer (Price-First + UPSERT)")
    print("=" * 60)

    # Validate environment
    if not SUPABASE_URL or not ANON_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables")
        sys.exit(1)

    # Authenticate
    token = login()
    print("✅ Auth OK\n")

    # Load manifests
    specs = load_manifests()
    if not specs:
        print("ℹ️ No product specifications found in /products/*.yml")
        return

    print(f"\n📦 Processing {len(specs)} product(s)…\n")

    payload = []
    skipped = []

    for rec in specs:
        print(f"{'=' * 60}")
        print(f"Product: {rec.get('name', 'Unknown')}")
        print(f"{'=' * 60}")

        # Required fields for pricing
        amz_url = rec.get("amazon_url")
        ae_candidates = rec.get("aliexpress_candidates", [])
        min_sales = int(rec.get("min_sales", 300))
        top_n = int(rec.get("top_n", 3))

        if not amz_url:
            print("⛔ Skip: Missing amazon_url")
            skipped.append({"external_id": rec.get("external_id"), "reason": "Missing amazon_url"})
            continue

        if not ae_candidates:
            print("⛔ Skip: Missing aliexpress_candidates")
            skipped.append({"external_id": rec.get("external_id"), "reason": "Missing aliexpress_candidates"})
            continue

        # 1) Price first (NO assets yet)
        amz_total = fetch_amazon_price_prime_only(amz_url)
        ae_total, best_ae_url = fetch_aliexpress_total_best(ae_candidates, min_sales=min_sales, top_n=top_n)

        # Fallback to explicit supplier_price if provided
        if ae_total is None and rec.get("supplier_price") is not None:
            ae_total = float(rec["supplier_price"])
            best_ae_url = ae_candidates[0] if ae_candidates else rec.get("aliexpress_url")
            print(f"   ℹ️ Using explicit supplier_price: ${ae_total:.2f}")

        # Enforce pricing rule
        pass_rule, reason = enforce_rule(ae_total, amz_total)
        print(f"\n   📊 Pricing Rule: {reason}")

        if not pass_rule:
            print(f"   ⛔ SKIPPED\n")
            skipped.append({"external_id": rec.get("external_id"), "reason": reason})
            continue

        # 2) Assets only AFTER PASS
        print(f"\n   📤 Uploading assets…")
        assets = collect_and_upload(token, rec.get("assets_dir", ""))

        if not assets["gifs"]:
            print(f"   ⚠️ No GIFs found (recommend minimum 3, no text)")

        # 3) Build product payload
        prod = build_product(rec, assets, ae_total, amz_total, reason, best_ae_url)
        payload.append(prod)

        print(f"   ✅ Ready to import: {len(assets['images'])} images, {len(assets['gifs'])} GIFs, {len(assets['videos'])} videos\n")

    if not payload:
        print("\n⚠️ No products passed pricing rules. Nothing to import.")
        if skipped:
            print("\nSkipped products:")
            print(json.dumps(skipped, indent=2))
        return

    # Import all products with UPSERT
    print(f"\n{'=' * 60}")
    print(f"📦 Sending UPSERT import for {len(payload)} product(s)…")
    print(f"{'=' * 60}\n")

    result = import_products(token, payload)

    print("\n" + "=" * 60)
    print("IMPORT RESULTS")
    print("=" * 60)
    print(json.dumps(result, indent=2))

    print("\n🎉 Done! Review products in /admin/product-approvals")

    if skipped:
        print("\n⚠️ Skipped products (pricing failed):")
        print(json.dumps(skipped, indent=2))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Import cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
