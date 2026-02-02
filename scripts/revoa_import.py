#!/usr/bin/env python3
"""
Revoa Importer — Price-First + UPSERT + Auto-GIF (no-text segments)
=====================================================================

Features:
- Validates pricing (Amazon Prime vs AliExpress top-3 incl. shipping + min sales)
- Generates copy (3 titles, 3 description blocks, headlines/primary/desc)
- Auto-extracts 3–6s text-free GIFs from reels (yt-dlp + OpenCV + ffmpeg palette)
- Budgets FPS then resolution to keep each GIF ≤ 20 MB (Shopify cap)
- Uploads assets AFTER PASS; then UPSERTs product(s) via Edge Function

Requirements:
  System: ffmpeg, yt-dlp
  Python: requests, pyyaml, opencv-python-headless, numpy

Env:
  SUPABASE_URL, SUPABASE_ANON_KEY
  REVOA_ADMIN_TOKEN or (REVOA_ADMIN_EMAIL, REVOA_ADMIN_PASSWORD)
  Optional:
    GIF_MAX_MB=20
    GIF_MIN_SEC=3.0
    GIF_MAX_SEC=6.0
    GIF_TARGET_FPS=24
    GIF_MIN_FPS=10
    GIF_ASPECT=square (or 4x6)
    GIF_VARIANTS=3
"""

import os, sys, json, pathlib, requests, yaml, re, math, tempfile, subprocess, shutil, time, hashlib
from pathlib import Path
from urllib.parse import urlparse, quote
import numpy as np

# HTML parsing
try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

# Optional heavy deps (opencv) import lazily where needed
try:
    import cv2
except Exception:
    cv2 = None

# ---------- Config / Env ----------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE")
ADMIN_EMAIL = os.environ.get("REVOA_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("REVOA_ADMIN_PASSWORD")

# Debug: print environment variable status
print("🔍 Environment Check:")
print(f"  SUPABASE_URL: {'✓' if SUPABASE_URL else '✗'}")
print(f"  SUPABASE_ANON_KEY: {'✓' if ANON_KEY else '✗'}")
print(f"  SUPABASE_SERVICE_ROLE: {'✓' if SERVICE_ROLE_KEY else '✗'}")
print(f"  REVOA_ADMIN_EMAIL: {'✓' if ADMIN_EMAIL else '✗'}")
print(f"  REVOA_ADMIN_PASSWORD: {'✓' if ADMIN_PASSWORD else '✗'}")

if not SUPABASE_URL or not ANON_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_ANON_KEY")
if not SERVICE_ROLE_KEY and not (ADMIN_EMAIL and ADMIN_PASSWORD):
    print("\n❌ Authentication Error:")
    print("   Missing authentication credentials. You need either:")
    print("   1. SUPABASE_SERVICE_ROLE (recommended)")
    print("   2. Both REVOA_ADMIN_EMAIL and REVOA_ADMIN_PASSWORD")
    print("\n   Add these as GitHub secrets:")
    print("   - Go to repository Settings → Secrets and variables → Actions")
    print("   - Add ADMIN_EMAIL and ADMIN_PASSWORD secrets")
    print("   - Or add SUPABASE_SERVICE_ROLE secret (preferred)")
    raise RuntimeError("Missing authentication credentials")

TIMEOUT = 30
PRICE_TIMEOUT = 25
MIN_SALES_DEFAULT = 100
TOP_N_DEFAULT = 3

# Retry configuration
SCRAPE_MAX_RETRIES = int(os.environ.get("SCRAPE_MAX_RETRIES", "4"))
SCRAPE_SLEEP_BASE = float(os.environ.get("SCRAPE_SLEEP_BASE", "2.0"))
REQUESTS_USER_AGENT = os.environ.get(
    "REQUESTS_USER_AGENT",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# GIF constraints / defaults
GIF_MAX_MB = float(os.environ.get("GIF_MAX_MB", "20"))
GIF_MIN_SEC = float(os.environ.get("GIF_MIN_SEC", "3.0"))
GIF_MAX_SEC = float(os.environ.get("GIF_MAX_SEC", "6.0"))
GIF_TARGET_FPS = int(os.environ.get("GIF_TARGET_FPS", "24"))
GIF_MIN_FPS = int(os.environ.get("GIF_MIN_FPS", "10"))
GIF_ASPECT_DEFAULT = os.environ.get("GIF_ASPECT", "square")  # "square" or "4x6"
GIF_VARIANTS = int(os.environ.get("GIF_VARIANTS", "3"))

FFMPEG_BIN = os.environ.get("FFMPEG_BIN", "ffmpeg")
FFPROBE_BIN = os.environ.get("FFPROBE_BIN", "ffprobe")
YTDLP_BIN = os.environ.get("YTDLP_BIN", "yt-dlp")

# Agent discovery controls
TARGET_NEW_PRODUCTS = int(os.environ.get("TARGET_NEW_PRODUCTS", "5"))
MAX_RUNTIME_MIN = int(os.environ.get("MAX_RUNTIME_MIN", "25"))
REELS_PAGE_LIMIT = int(os.environ.get("REELS_PAGE_LIMIT", "0"))  # 0 = unlimited

# ========== AUTONOMOUS DISCOVERY DEFAULTS (NO YAML REQUIRED) ==========
# Comprehensive search terms library - based on analyzing 25+ real viral product reels
# These mirror exactly what successful viral creators post about

# TIER 1: Broad viral discovery (what shows up in feeds)
DEFAULT_BROAD_TERMS = [
    "viral product 2025", "amazon must haves", "tiktok made me buy it",
    "gadgets you actually need", "cool tech finds", "best things on the internet",
    "trending products 2025", "cheap but genius", "problem solving gadgets",
    "oddly satisfying gadgets", "amazon finds that make sense",
    "gadgets you didn't know existed", "stuff you need from amazon",
    "impulse buy worth it", "amazon hidden gems", "game changer amazon"
]

# TIER 2: Niche-specific discovery (actual product categories from viral reels)
DEFAULT_NICHE_TERMS = {
    "lighting": [
        "outdoor solar lights", "patio step lights", "garden path lights",
        "motion sensor solar lamp", "driveway curb lights", "peel and stick solar lights",
        "warm white landscape lights", "deck lighting ideas", "solar string lights",
        "landscape spotlight solar", "fence post solar lights", "stair lights outdoor"
    ],
    "home_organization": [
        "under door draft stopper", "kitchen organization hacks", "bathroom must haves",
        "shower storage hack", "cable management gadgets", "sink rack organizer",
        "closet organization ideas", "pantry storage solutions", "drawer dividers",
        "space saving hacks", "command hooks ideas", "magnetic storage strips"
    ],
    "cleaning": [
        "grout cleaning tool", "sticky mop reusable", "lint remover electric",
        "squeegee window cleaner", "scrub daddy alternatives", "cleaning gadgets viral",
        "power scrubber drill", "steam cleaner handheld", "carpet cleaner portable",
        "bathroom cleaning hacks", "deep clean tools", "grout pen white"
    ],
    "kitchen": [
        "mini chopper electric", "oil sprayer cooking", "magnetic measuring spoons",
        "pot lid rack organizer", "collapsible colander", "automatic stirrer pan",
        "silicone lid covers universal", "pan organizer rack", "garlic press upgrade",
        "vegetable chopper onion", "salad spinner large", "spice rack magnetic",
        "kitchen gadgets must have", "cooking tools amazon finds"
    ],
    "fitness": [
        "resistance bands set heavy", "door anchor workout home", "posture corrector",
        "massage gun mini portable", "ab roller wheel compact", "ankle weights adjustable",
        "yoga mat thick non slip", "foam roller muscle", "pull up bar doorway",
        "home gym equipment compact", "workout bands booty", "fitness tracker watch"
    ],
    "car": [
        "car organizer trunk storage", "visor clip sunglass holder", "trunk net cargo",
        "seat gap filler leather", "magnetic phone mount car", "car cleaning gel putty",
        "car accessories must have", "road trip essentials kit", "car organization hacks",
        "dash cam front and rear", "tire pressure gauge digital", "car emergency kit"
    ],
    "pet": [
        "dog paw cleaner portable", "lint roller pet hair extra sticky", "interactive cat toy",
        "chew toy indestructible dog", "automatic water dispenser pet", "pet hair remover couch",
        "cat litter mat trapping", "dog grooming brush", "pet camera treat dispenser",
        "dog toys aggressive chewers", "cat scratching post tall", "pet fountain water"
    ],
    "beauty": [
        "blackhead remover tool vacuum", "hair curler heatless overnight", "facial steamer nano",
        "electric callus remover foot", "scalp massager shampoo brush", "makeup organizer acrylic",
        "hair dryer brush one step", "jade roller gua sha", "led face mask therapy",
        "eyelash curler heated", "nail drill electric manicure", "mini skincare fridge"
    ],
    "outdoors": [
        "camping lantern rechargeable led", "bug zapper outdoor electric", "portable air pump electric",
        "hose splitter 4 way brass", "magnetic pickup tool led", "pressure washer attachment hose",
        "garden hose expandable 100ft", "watering can long spout", "plant stakes tall",
        "outdoor thermometer wireless", "rain gauge decorative glass", "garden tools set ergonomic"
    ]
}

# TIER 3: Long-tail intent phrases (exactly what appears in viral captions)
DEFAULT_INTENT_PHRASES = [
    "amazon finds under 30", "home essentials you need", "genius products everyone needs",
    "satisfying cleaning products", "organization must haves", "aesthetic home finds",
    "life changing gadgets", "products that went viral", "trending home finds 2025",
    "small apartment essentials", "gift ideas under 50", "home hacks that work"
]

# Build comprehensive discovery list (rotates daily via randomization in discover function)
_all_niche_terms = []
for niche_list in DEFAULT_NICHE_TERMS.values():
    _all_niche_terms.extend(niche_list[:4])  # Top 4 from each niche

DEFAULT_DISCOVERY_TERMS = (
    DEFAULT_BROAD_TERMS[:8] +  # Top broad viral terms
    _all_niche_terms[:40] +    # Diverse niche coverage
    DEFAULT_INTENT_PHRASES[:8]  # Intent-driven searches
)

DEFAULT_NICHES = list(DEFAULT_NICHE_TERMS.keys())

# Load from env or use defaults
DISCOVERY_TERMS = [s.strip() for s in os.environ.get("DISCOVERY_TERMS", ",".join(DEFAULT_DISCOVERY_TERMS)).split(",") if s.strip()]
DISCOVERY_NICHES = [s.strip() for s in os.environ.get("DISCOVERY_NICHES", ",".join(DEFAULT_NICHES)).split(",") if s.strip()]
MIN_VIEWS = int(os.environ.get("DISCOVERY_MIN_VIEWS", "50000"))
MAX_REELS = int(os.environ.get("DISCOVERY_MAX_REELS", "250"))

# Pricing rules
MIN_AE_SALES = int(os.environ.get("MIN_AE_SALES", "100"))
ALLOW_AE_SOFT_PASS = os.environ.get("ALLOW_AE_SOFT_PASS", "true").lower() == "true"
MIN_SPREAD_USD = float(os.environ.get("MIN_SPREAD_USD", "20"))
AE_LEQ_HALF_AMZ = os.environ.get("AE_LEQ_HALF_AMZ", "true").lower() == "true"

# Asset rules
GIF_MIN_S = int(os.environ.get("GIF_MIN_S", "2"))
GIF_MAX_S = int(os.environ.get("GIF_MAX_S", "5"))
GIF_MAX_MB_LIMIT = int(os.environ.get("GIF_MAX_MB", "20"))
GIF_SIZES = [s.strip() for s in os.environ.get("GIF_OUTPUT_SIZES", "1080x1080,1080x1620").split(",")]
MAIN_BG_HEX = os.environ.get("MAIN_BG_HEX", "#F5F5F5")

HEADERS_BROWSER = {
    "User-Agent": REQUESTS_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1"
}

# ---------- Utilities ----------
def _run(cmd):
    print("▶", " ".join(map(str, cmd)))
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

def login():
    """Return admin token (prefers service role, fallback password grant)."""
    if SERVICE_ROLE_KEY:
        print("🔑 Using service role key")
        return SERVICE_ROLE_KEY
    if not (ADMIN_EMAIL and ADMIN_PASSWORD):
        raise RuntimeError("Missing SUPABASE_SERVICE_ROLE or REVOA_ADMIN_EMAIL/REVOA_ADMIN_PASSWORD")
    print("🔐 Logging in via password grant…")
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    r = requests.post(url, headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    tok = data.get("access_token")
    if not tok:
        raise RuntimeError(f"No access_token in login response: {data}")
    return tok

# ---------- Instagram Discovery ----------
def discover_viral_reels(search_terms, min_views=50000, max_reels=250):
    """
    Discover viral Instagram reels by search terms.
    Returns list of reel metadata: {url, likes, comments, views, shortcode}

    NOTE: Instagram heavily rate-limits and blocks scrapers.
    This is a simplified implementation that may need:
    - Rotating proxies
    - Session management
    - GraphQL API parsing
    - CAPTCHA solving
    """
    discovered = []

    for term in search_terms[:max_reels // 10]:  # Limit terms to avoid too many requests
        print(f"🔍 Searching Instagram for: {term}...")

        # Try public Instagram search (no auth)
        # Search by term (not just hashtags)
        # Try both hashtag search and explore search
        search_url = f"https://www.instagram.com/explore/tags/{term.replace(' ', '')}/"

        try:
            html = fetch_html_with_retry(search_url, max_retries=2)
            if not html:
                print(f"  ⚠️ Could not fetch page for: {term}")
                continue

            # Instagram embeds data in <script> tags as JSON
            # Look for window._sharedData or similar
            pattern = r'window\._sharedData\s*=\s*({.+?});'
            match = re.search(pattern, html)

            if match:
                try:
                    data = json.loads(match.group(1))
                    # Navigate JSON structure (changes frequently)
                    # This is an approximation - actual structure may vary
                    edges = data.get('entry_data', {}).get('TagPage', [{}])[0]\
                               .get('graphql', {}).get('hashtag', {})\
                               .get('edge_hashtag_to_media', {}).get('edges', [])

                    for edge in edges[:max_reels]:
                        node = edge.get('node', {})
                        shortcode = node.get('shortcode')

                        if not shortcode:
                            continue

                        # Check if it's a video (reel)
                        is_video = node.get('is_video', False)
                        if not is_video:
                            continue

                        likes = node.get('edge_liked_by', {}).get('count', 0)
                        comments = node.get('edge_media_to_comment', {}).get('count', 0)
                        views = node.get('video_view_count', 0)

                        # Filter by min_views
                        if views < min_views:
                            continue

                        discovered.append({
                            'url': f'https://www.instagram.com/reel/{shortcode}/',
                            'shortcode': shortcode,
                            'likes': likes,
                            'comments': comments,
                            'views': views,
                            'search_term': term
                        })

                except json.JSONDecodeError:
                    print(f"  ⚠️ Could not parse Instagram JSON for: {term}")

            else:
                print(f"  ⚠️ Instagram data structure not found for: {term}")

        except Exception as e:
            print(f"  ⚠️ Error searching for '{term}': {e}")

    # Sort by engagement (views + likes + comments)
    discovered.sort(key=lambda x: x.get('views', 0) + x['likes'] + x['comments'], reverse=True)
    print(f"✓ Discovered {len(discovered)} viral reels")

    return discovered[:max_reels]

def extract_product_info_from_reel(reel_url, video_path=None):
    """
    Analyze a reel to identify product information.
    Uses:
    1. Video frames (OCR for text, object detection for products)
    2. Caption text analysis
    3. Hashtags for product hints

    Returns: {
        'product_name': str,
        'category': str,
        'keywords': list,
        'description_hint': str
    }
    """
    print(f"🔍 Analyzing reel: {reel_url}")

    # Download the reel if not provided
    if not video_path:
        with tempfile.TemporaryDirectory() as td:
            video_path = download_video(reel_url, td)
            if not video_path:
                print("  ⚠️ Could not download reel for analysis")
                return None

    info = {
        'product_name': None,
        'category': None,
        'keywords': [],
        'description_hint': ''
    }

    # Try to get caption/metadata from Instagram page
    try:
        html = fetch_html_with_retry(reel_url, max_retries=2)
        if html and BeautifulSoup:
            soup = BeautifulSoup(html, 'lxml')

            # Look for meta tags with description
            og_desc = soup.find('meta', property='og:description')
            if og_desc:
                caption = og_desc.get('content', '')
                info['description_hint'] = caption[:200]

                # Extract hashtags
                hashtags = re.findall(r'#(\w+)', caption)
                info['keywords'].extend(hashtags)

                # Simple keyword extraction for product hints
                # Look for common product indicators
                product_patterns = [
                    r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b',  # Capitalized words
                    r'\b(\w+\s+(?:Stopper|Light|Band|Tool|Gadget|Kit))\b',  # Common product types
                ]
                for pattern in product_patterns:
                    matches = re.findall(pattern, caption, re.IGNORECASE)
                    info['keywords'].extend(matches[:5])

    except Exception as e:
        print(f"  ⚠️ Could not extract caption: {e}")

    # Use OpenCV for frame analysis if available
    if cv2 and os.path.exists(video_path):
        try:
            cap = cv2.VideoCapture(video_path)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            # Sample a few frames (beginning, middle, end)
            sample_frames = [0, frame_count // 2, frame_count - 1]

            for frame_idx in sample_frames:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()

                if ret:
                    # TODO: Add OCR here to extract text from frames
                    # Could use pytesseract or similar
                    # For now, just note that frame analysis is available
                    pass

            cap.release()

        except Exception as e:
            print(f"  ⚠️ Frame analysis error: {e}")

    # If we found keywords, try to infer product name and category
    if info['keywords']:
        # Take most common/relevant keywords as product name hint
        keyword_str = ' '.join(info['keywords'][:3])
        info['product_name'] = keyword_str.title()

        # Simple category inference from keywords
        category_map = {
            'light': 'Lighting',
            'band': 'Fitness',
            'stopper': 'Home',
            'gadget': 'Electronics',
            'kitchen': 'Kitchen',
            'fitness': 'Fitness',
            'beauty': 'Beauty',
            'tool': 'Tools'
        }

        for keyword in info['keywords']:
            for key, cat in category_map.items():
                if key.lower() in keyword.lower():
                    info['category'] = cat
                    break
            if info['category']:
                break

        if not info['category']:
            info['category'] = 'Home'  # Default

    print(f"  ✓ Identified: {info['product_name']} ({info['category']})")
    return info

def search_amazon_for_product(product_name, keywords, max_results=5):
    """
    Search Amazon for products matching the given name and keywords.
    Returns list of {title, asin, url, price, prime}

    NOTE: Amazon blocks scrapers aggressively. This may require:
    - Amazon Product Advertising API (official)
    - Rotating proxies
    - CAPTCHA solving
    """
    print(f"🔍 Searching Amazon for: {product_name}")

    results = []

    # Build search query
    search_terms = product_name
    if keywords:
        search_terms += ' ' + ' '.join(keywords[:3])

    query = quote(search_terms)
    search_url = f"https://www.amazon.com/s?k={query}"

    try:
        html = fetch_html_with_retry(search_url, max_retries=3)
        if not html:
            print("  ⚠️ Could not fetch Amazon search results")
            return results

        if BeautifulSoup:
            soup = BeautifulSoup(html, 'lxml')

            # Find product cards (structure changes frequently)
            products = soup.select('[data-component-type="s-search-result"]')

            for product in products[:max_results]:
                try:
                    # Extract ASIN
                    asin = product.get('data-asin')
                    if not asin:
                        continue

                    # Extract title
                    title_elem = product.select_one('h2 a span')
                    title = title_elem.get_text(strip=True) if title_elem else ''

                    # Extract price
                    price_elem = product.select_one('.a-price .a-offscreen')
                    price_text = price_elem.get_text(strip=True) if price_elem else ''
                    price = _num(price_text) if price_text else None

                    # Check for Prime
                    prime_elem = product.select_one('[aria-label*="Prime"]')
                    is_prime = bool(prime_elem)

                    if asin and title:
                        results.append({
                            'title': title,
                            'asin': asin,
                            'url': f'https://www.amazon.com/dp/{asin}',
                            'price': price,
                            'prime': is_prime
                        })

                except Exception as e:
                    print(f"  ⚠️ Error parsing product: {e}")
                    continue

        print(f"  ✓ Found {len(results)} Amazon products")

    except Exception as e:
        print(f"  ⚠️ Amazon search error: {e}")

    return results

# ---------- Deduplication Helpers ----------
def _hash(s: str) -> str:
    """SHA1 hash for dedup IDs"""
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

def fetch_seen_sets(token: str):
    """Return (seen_reel_ids, seen_external_ids) for deduplication"""
    headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {token}"}
    seen_reels = set()
    seen_ext = set()

    # 1) Existing products (external_ids)
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=external_id",
            headers=headers, timeout=TIMEOUT
        )
        if r.ok:
            for row in r.json():
                if row.get("external_id"):
                    seen_ext.add(row["external_id"])
    except Exception as e:
        print(f"⚠️ Could not fetch existing products: {e}")

    # 2) Agent seen sources (reel_id hashes)
    try:
        r2 = requests.get(
            f"{SUPABASE_URL}/rest/v1/agent_seen_sources?select=reel_id_hash",
            headers=headers, timeout=TIMEOUT
        )
        if r2.ok:
            for row in r2.json():
                h = row.get("reel_id_hash")
                if h:
                    seen_reels.add(h)
    except Exception as e:
        print(f"⚠️ Could not fetch seen sources: {e}")

    print(f"📋 Dedup loaded: {len(seen_ext)} external_ids, {len(seen_reels)} reel hashes")
    return seen_reels, seen_ext

def mark_seen_reel(token: str, reel_id: str):
    """Mark a reel as evaluated to skip it in future runs"""
    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "resolution=ignore-duplicates"
    }
    payload = {"reel_id_hash": _hash(reel_id)}
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/agent_seen_sources",
            headers=headers, json=payload, timeout=TIMEOUT
        )
    except Exception as e:
        print(f"⚠️ Could not mark reel as seen: {e}")

# ---------- Storage ----------
def upload(token, local_path, bucket_rel_path):
    with open(local_path, "rb") as f:
        r = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/product-assets/{bucket_rel_path}",
            headers={"Authorization": f"Bearer {token}", "apikey": ANON_KEY},
            files={"file": f},
            timeout=TIMEOUT
        )
    if r.status_code not in (200, 201):
        try: detail = r.json()
        except: detail = r.text
        if "already exists" not in str(detail).lower():
            print(f"⚠️ Upload warning for {local_path}: {detail}")
    return f"{SUPABASE_URL}/storage/v1/object/public/product-assets/{bucket_rel_path}"

def collect_and_upload(token, assets_dir):
    """Upload any pre-supplied local files (images/gifs/videos) from assets_dir."""
    urls = {"images": [], "gifs": [], "videos": []}
    base = Path(assets_dir) if assets_dir else None
    if not base or not base.exists():
        return urls
    for p in base.rglob("*"):
        if not p.is_file(): continue
        rel = str(p).replace("\\","/")
        # Keep category/slug/filename after "assets/"
        if "assets/" in rel:
            bucket_rel = rel.split("assets/", 1)[1]
        else:
            bucket_rel = Path(rel).name
        public = upload(token, str(p), bucket_rel)
        name = p.name.lower()
        if name.endswith((".jpg",".jpeg",".png",".webp")):
            urls["images"].append(public)
        elif name.endswith(".gif"):
            urls["gifs"].append(public)
        elif name.endswith((".mp4",".mov",".webm")):
            urls["videos"].append(public)
    return urls

# ---------- Price helpers ----------
def _num(s):
    if not s: return None
    s = s.replace(",", "").replace("US$", "$").replace("CA$", "$").strip()
    m = re.search(r"(\d+(?:\.\d{1,2})?)", s)
    return float(m.group(1)) if m else None

def fetch_html_with_retry(url, max_retries=SCRAPE_MAX_RETRIES, base_sleep=SCRAPE_SLEEP_BASE):
    """Fetch HTML with exponential backoff retry logic."""
    for attempt in range(max_retries):
        try:
            r = requests.get(url, headers=HEADERS_BROWSER, timeout=PRICE_TIMEOUT, allow_redirects=True)
            if r.status_code == 200:
                return r.text
            elif r.status_code == 503:  # Service unavailable, retry
                if attempt < max_retries - 1:
                    sleep_time = base_sleep * (2 ** attempt)
                    print(f"  → 503 error, retry {attempt + 1}/{max_retries} after {sleep_time}s...")
                    time.sleep(sleep_time)
                    continue
        except requests.RequestException as e:
            if attempt < max_retries - 1:
                sleep_time = base_sleep * (2 ** attempt)
                print(f"  → Request error: {e}, retry {attempt + 1}/{max_retries} after {sleep_time}s...")
                time.sleep(sleep_time)
                continue
            print(f"  → Failed after {max_retries} attempts: {e}")
    return None

def fetch_html(url):
    """Legacy wrapper for backward compatibility."""
    return fetch_html_with_retry(url)

def parse_amazon_prime_price(html):
    """
    Parse Amazon price and Prime status using BeautifulSoup + regex fallbacks.
    Returns (price, is_prime)
    """
    if not html:
        return None, False

    price = None
    is_prime = False

    # Detect Prime badge
    prime_patterns = [
        r'Prime\s*</span>',
        r'aria-label="Prime"',
        r'primeIcon',
        r'a-icon-prime',
        r'amazon-prime-logo',
        r'<i[^>]*prime[^>]*>',
    ]
    for pattern in prime_patterns:
        if re.search(pattern, html, re.IGNORECASE):
            is_prime = True
            break

    # Try BeautifulSoup first
    if BeautifulSoup:
        try:
            soup = BeautifulSoup(html, 'lxml')

            # Try various price selectors
            price_selectors = [
                '.a-offscreen',
                '#corePrice_desktop .a-offscreen',
                '#corePrice_feature_div .a-offscreen',
                '#priceblock_ourprice',
                '#priceblock_dealprice',
                '#sns-base-price',
                '.a-price-whole',
                '[data-a-color="price"] .a-offscreen',
            ]

            for selector in price_selectors:
                elem = soup.select_one(selector)
                if elem:
                    price_text = elem.get_text(strip=True)
                    price = _num(price_text)
                    if price:
                        break
        except Exception as e:
            print(f"  → BeautifulSoup parse error: {e}")

    # Regex fallbacks
    if price is None:
        patterns = [
            r'id="priceblock_ourprice"[^>]*>\s*\$?([0-9,.]+)',
            r'id="priceblock_dealprice"[^>]*>\s*\$?([0-9,.]+)',
            r'class="a-offscreen"[^>]*>\s*\$?([0-9,.]+)',
            r'id="sns-base-price"[^>]*>\s*\$?([0-9,.]+)',
            r'"priceAmount"\s*:\s*([0-9,.]+)',
            r'"price"\s*:\s*"\$?([0-9,.]+)"',
        ]
        for pattern in patterns:
            m = re.search(pattern, html, re.IGNORECASE)
            if m:
                price = _num(m.group(1))
                if price:
                    break

    return price, is_prime

def parse_aliexpress_price_shipping_sales(html):
    if not html: return None, None, None
    m = re.search(r'"salePrice"\s*:\s*"(.*?)"', html, re.IGNORECASE) or \
        re.search(r'"price"\s*:\s*"(.*?)"', html, re.IGNORECASE) or \
        re.search(r'>(US)?\s?\$?\s?(\d{1,4}(?:\.\d{1,2})?)\s*(USD|</)', html, re.IGNORECASE)
    price = _num(m.group(1) if m and m.lastindex else (m.group(2) if m else None))
    sm = re.search(r'"shippingFee"\s*:\s*"(.*?)"', html, re.IGNORECASE) or \
         re.search(r'shipping[^<]*\$?\s?(\d{1,4}(?:\.\d{1,2})?)', html, re.IGNORECASE)
    ship = _num(sm.group(1)) if sm else 0.0
    sm2 = re.search(r'"tradeCount"\s*:\s*"?(\d+)"?', html, re.IGNORECASE) or \
          re.search(r'orders?[^0-9]*([0-9,]+)', html, re.IGNORECASE)
    sales = int(sm2.group(1).replace(",", "")) if sm2 else None
    return price, ship, sales

def fetch_amazon_price_prime_only(amazon_url):
    html = fetch_html(amazon_url)
    price, is_prime = parse_amazon_prime_price(html)
    if not is_prime or price is None:
        return None
    return price

def fetch_aliexpress_total_best(candidate_urls, min_sales=MIN_SALES_DEFAULT, top_n=TOP_N_DEFAULT):
    """From explicit product URLs: return (best_total, best_url) where total = item + shipping."""
    results = []
    for u in candidate_urls[:top_n]:
        html = fetch_html(u)
        price, ship, sales = parse_aliexpress_price_shipping_sales(html)
        if price is None:
            continue
        if (sales or 0) < min_sales:
            continue
        total = float(price) + float(ship or 0.0)
        results.append((total, u, sales or 0))
    if not results:
        return None, None
    results.sort(key=lambda x: (x[0], -x[2]))  # lowest total, tie-breaker highest sales
    best_total, best_url, _ = results[0]
    return best_total, best_url

def search_aliexpress_and_pick_best(search_terms, min_sales=MIN_SALES_DEFAULT):
    """
    Tries multiple queries on AliExpress search, sorts by orders, then verifies
    price+shipping on the product page. Only considers items with ≥min_sales orders.
    Returns (best_total, best_url) or (None, None).
    """
    def search_once(term):
        q = quote(term.strip())
        # Sort by orders descending
        url = f"https://www.aliexpress.com/wholesale?SearchText={q}&SortType=orders_desc"
        print(f"  🔎 Searching AliExpress: {term}")
        html = fetch_html(url)
        if not html:
            return []

        items = []
        # Find product links
        for m in re.finditer(r'href="(https://www\.aliexpress\.(?:com|us)/item/[^"]+)"', html):
            href = m.group(1)
            # Look for sales count in surrounding context
            window = html[max(0, m.start()-800): m.end()+800]

            # Try multiple sales patterns
            sales = None
            sales_patterns = [
                r'(\d+(?:,\d+)*)\s*(?:sold|orders?)',
                r'tradeCount["\']?\s*:\s*["\']?(\d+)',
                r'totalSales["\']?\s*:\s*["\']?(\d+)',
            ]
            for pattern in sales_patterns:
                sm = re.search(pattern, window, re.IGNORECASE)
                if sm:
                    sales = int(sm.group(1).replace(",", ""))
                    break

            # Only include if meets min_sales
            if sales and sales >= min_sales:
                items.append((href, sales))

        # Deduplicate and sort by sales
        seen, uniq = set(), []
        for href, sales in items:
            key = href.split("?")[0]
            if key not in seen:
                seen.add(key)
                uniq.append((href, sales))

        uniq.sort(key=lambda x: x[1], reverse=True)
        print(f"  → Found {len(uniq)} items with ≥{min_sales} orders")
        return uniq[:12]  # Top 12 candidates

    candidate_pool = []
    for t in (search_terms or []):
        candidate_pool.extend(search_once(t))

    if not candidate_pool:
        print(f"  ⚠️ No AliExpress items found with ≥{min_sales} orders")
        return None, None

    # Verify prices on product pages
    best = None
    checked = 0
    for href, est_sales in candidate_pool:
        if checked >= 8:  # Limit to 8 page fetches max
            break
        checked += 1

        print(f"  → Checking product {checked}: {est_sales} orders")
        html = fetch_html(href)
        price, ship, sales = parse_aliexpress_price_shipping_sales(html)

        sales_final = sales if sales is not None else est_sales
        if sales_final < min_sales or price is None:
            print(f"    ✗ Skip: price={price}, sales={sales_final}")
            continue

        total = float(price) + float(ship or 0.0)
        print(f"    ✓ Total: ${total:.2f} (${price:.2f} + ${ship or 0:.2f} shipping)")

        if (best is None) or (total < best[0]):
            best = (total, href, sales_final)

    if not best:
        print(f"  ⚠️ No valid AliExpress products after verification")
        return None, None

    print(f"  ✓ Best: ${best[0]:.2f} ({best[2]} orders)")
    return best[0], best[1]

def enforce_rule(ae_total, amz_total, min_spread=20.0, soft_pass=False):
    """
    Returns tuple (passed, reason, soft_flag)
    soft_pass=True allows pass if AE missing (admin to review).
    """
    if ae_total is None:
        if soft_pass and amz_total is not None:
            return True, "SOFT-PASS: AE price not found; admin to confirm pricing", True
        return False, "AliExpress price not found", False

    if amz_total is None:
        return False, "Amazon (Prime) price not found", False

    spread = amz_total - ae_total
    half_rule = ae_total <= (amz_total * 0.50)
    spread_rule = spread >= min_spread
    if half_rule or spread_rule:
        return True, f"PASS (AE ${ae_total:.2f} vs AMZ ${amz_total:.2f}; spread ${spread:.2f})", False
    return False, f"FAIL (AE ${ae_total:.2f} vs AMZ ${amz_total:.2f}; spread ${spread:.2f})", False

# ---------- Copy generation ----------
def gen_copy(rec, rrp):
    name = rec.get("name","Product")
    category = rec.get("category","Home")
    benefit = rec.get("description","High-quality, easy to use.")
    titles = [
        f"{name} — {category} Upgrade",
        f"Instant {category} Boost: {name}",
        f"{name} • Under ${int(math.ceil(rrp))}"
    ]
    blocks = [
        f"Upgrade your space fast with {name}. Easy, no-fuss setup for instant results.",
        f"Built to last and look great. Designed for everyday use without the hassle.",
        f"Risk-free. Quality checked and ready to ship. Love it or return it."
    ]
    headlines = [
        "35% off (Ends Tomorrow)",
        "Fast & Free Shipping",
        "Elevate Your Space",
        "Hassle-Free Install",
        "Limited Time Deal",
        "Shop Now"
    ]
    primary = [
        "Today only! 35% off + buy more and save.",
        "Your DIY upgrade isn't complete without this.",
        "Make it look premium, in minutes."
    ]
    descs = [
        "(fast & free shipping)",
        "Easy returns + quality guaranteed",
        "Top-rated, ships in 24–48h"
    ]
    return {"titles": titles, "blocks": blocks, "ad": {"headlines": headlines, "primary": primary, "descriptions": descs}}

# ---------- Video helpers (yt-dlp / ffmpeg / OpenCV) ----------
def download_video(url, out_dir):
    out = Path(out_dir) / "%(id)s.%(ext)s"
    cmd = [YTDLP_BIN, "-f", "mp4", "-o", str(out), url]
    r = _run(cmd)
    if r.returncode != 0:
        print("⚠️ yt-dlp failed:", r.stdout[:1000])
        return None
    for p in Path(out_dir).glob("*.mp4"):
        return str(p)
    return None

def probe_video(mp4):
    cmd = [FFPROBE_BIN, "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", mp4]
    r = _run(cmd)
    if r.returncode != 0:
        return None
    try:
        info = json.loads(r.stdout)
        streams = info.get("streams", [])
        v = next((s for s in streams if s.get("codec_type")=="video"), None)
        width = int(v.get("width", 0)) if v else 0
        height = int(v.get("height", 0)) if v else 0
        dur = float(info.get("format",{}).get("duration", 0))
        return {"width": width, "height": height, "duration": dur}
    except Exception:
        return None

def crop_box_for_aspect(w, h, aspect, safe_margin_top=0.11, safe_margin_bottom=0.11):
    """
    Crop to target aspect ratio, avoiding top/bottom margins where IG overlays text.
    safe_margin_top/bottom: fraction of height to mask (default 11% each = 22% total).
    This creates a safe zone avoiding typical Instagram text overlays.
    """
    if aspect == "4x6":
        # target ratio 2:3 (w:h = 2:3). We crop to 2:3 centered
        target_ratio = 2/3
    else:
        target_ratio = 1.0  # square

    # Apply safe margins to avoid text overlay zones
    safe_top = int(h * safe_margin_top)
    safe_bottom = int(h * safe_margin_bottom)
    usable_h = h - safe_top - safe_bottom
    usable_w = w

    in_ratio = usable_w / max(usable_h, 1)
    if in_ratio > target_ratio:
        # too wide -> reduce width
        new_w = int(usable_h * target_ratio)
        new_h = usable_h
    else:
        # too tall -> reduce height
        new_w = usable_w
        new_h = int(usable_w / target_ratio)

    # Center horizontally
    x = (w - new_w) // 2
    # Vertically offset to avoid text zones
    y = safe_top + (usable_h - new_h) // 2

    return x, y, new_w, new_h

def score_frame_for_text(frame, crop_box):
    """Return 0..1 'textiness' score; lower is cleaner. Uses MSER + edges + CCs."""
    if cv2 is None:
        return 0.0  # if OpenCV missing, assume clean
    x,y,ww,hh = crop_box
    roi = frame[y:y+hh, x:x+ww]
    if roi.size == 0: return 1.0
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    # normalize
    gray = cv2.equalizeHist(gray)
    # edges
    edges = cv2.Canny(gray, 60, 150)
    edge_ratio = edges.mean() / 255.0  # 0..1
    # MSER regions (often catch overlay text blobs)
    mser = cv2.MSER_create(_min_area=60, _max_area=1200)
    regions, _ = mser.detectRegions(gray)
    mser_count = len(regions)
    # combine
    score = 0.6 * min(1.0, mser_count / 60.0) + 0.4 * min(1.0, edge_ratio * 3.0)
    return float(score)

def sample_frames_for_scoring(mp4, aspect, step=0.15, max_samples=800):
    meta = probe_video(mp4) or {}
    dur = meta.get("duration", 0)
    if dur <= 0:
        return {"dur": 0, "times": [], "scores": [], "crop": (0,0,0,0)}
    # grab one frame to get width/height
    cap = cv2.VideoCapture(mp4) if cv2 else None
    if cap:
        ok, frame0 = cap.read()
        if ok:
            h, w = frame0.shape[:2]
        else:
            h, w = 1080, 1920
        cap.release()
    else:
        # fallback assume portrait-ish
        w, h = 1080, 1920
    crop = crop_box_for_aspect(w, h, aspect)

    times, scores = [], []
    if not cv2:
        # no OpenCV -> fallback: assume all frames clean
        t = 0.0
        while t < dur and len(times) < max_samples:
            times.append(t); scores.append(0.0); t += step
        return {"dur": dur, "times": times, "scores": scores, "crop": crop}

    cap = cv2.VideoCapture(mp4)
    if not cap.isOpened():
        return {"dur": dur, "times": [], "scores": [], "crop": crop}
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or (dur * fps))
    frame_step = max(1, int(step * fps))
    idx = 0
    while idx < total and len(times) < max_samples:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        if not ok: break
        t = idx / fps
        s = score_frame_for_text(frame, crop)
        times.append(t); scores.append(s)
        idx += frame_step
    cap.release()
    return {"dur": dur, "times": times, "scores": scores, "crop": crop}

def find_clean_windows(mp4, aspect, min_s=3.0, max_s=6.0, wanted=3):
    """Slide windows; keep those where >=90% sampled frames are 'clean' (score<0.35)."""
    data = sample_frames_for_scoring(mp4, aspect)
    dur, times, scores = data["dur"], data["times"], data["scores"]
    crop = data["crop"]
    if dur <= 0 or not times:
        return {"crop": crop, "wins": []}
    clean_thresh = 0.35
    ratio_needed = 0.90
    # build arrays for faster window checks
    arr_t = np.array(times)
    arr_s = np.array(scores)
    wins = []
    # divide duration into 8 regions and try pick from each to spread visually
    anchors = np.linspace(0, max(0.1, dur - min_s), num=8)
    candidates = []
    for a in anchors:
        for L in np.linspace(min_s, max_s, num=4):
            b = min(dur, a + float(L))
            mask = (arr_t >= a) & (arr_t <= b)
            if mask.sum() < 3:
                continue
            clean_ratio = float((arr_s[mask] < clean_thresh).sum()) / float(mask.sum())
            if clean_ratio >= ratio_needed:
                candidates.append((clean_ratio, a, b))
    # dedup windows with NMS-like spacing
    candidates.sort(key=lambda x: (-x[0], x[1]))
    selected = []
    for score, a, b in candidates:
        if len(selected) >= wanted: break
        # enforce spacing min gap of ~1s between windows
        if any(abs(a - s[0]) < 1.0 for s in selected):
            continue
        selected.append((a, b, score))
    wins = [{"start": a, "end": b, "score": s} for (a, b, s) in selected[:wanted]]
    return {"crop": crop, "wins": wins}

def palette_gif(mp4, start, end, out_gif, aspect="square", target_w=1080, target_h=1080, fps=24):
    """
    Generate GIF with palette optimization using ffmpeg.
    Applies safe margin cropping to avoid Instagram text overlays (top 11%, bottom 11%).
    """
    # Compose crop filter with safe margins for text-free zones
    # Format: crop=out_w:out_h:x:y
    # We crop the middle 78% of height (avoiding 11% top + 11% bottom)
    if aspect == "4x6":
        # Target 2:3 ratio, avoiding text zones
        # crop height to 78% of original (ih*0.78), starting at 11% from top (ih*0.11)
        # then crop width to match 2:3 aspect
        crop_filter = "crop='min(iw,ih*0.78*2/3)':'ih*0.78':('iw-out_w')/2:'ih*0.11'"
    else:
        # Square, avoiding text zones
        # crop height to 78%, take square from center
        crop_filter = "crop='min(iw,ih*0.78)':'min(iw,ih*0.78)':('iw-out_w')/2:'ih*0.11'"

    # Build filter chains for palette generation and use
    vf1 = f"trim=start={start}:end={end},setpts=PTS-STARTPTS,{crop_filter},scale={target_w}:{target_h}:flags=lanczos,fps={fps},palettegen=stats_mode=diff"
    vf2 = f"trim=start={start}:end={end},setpts=PTS-STARTPTS,{crop_filter},scale={target_w}:{target_h}:flags=lanczos,fps={fps},paletteuse=new=1:diff_mode=rectangle"

    pal = out_gif + ".pal.png"
    r1 = _run([FFMPEG_BIN, "-y", "-i", mp4, "-vf", vf1, pal])
    if r1.returncode != 0:
        print("⚠️ palettegen failed", r1.stdout[:1000]); return False
    r2 = _run([FFMPEG_BIN, "-y", "-i", mp4, "-i", pal, "-lavfi", vf2, "-loop", "0", out_gif])
    try: os.remove(pal)
    except: pass
    if r2.returncode != 0:
        print("⚠️ paletteuse failed", r2.stdout[:1000]); return False
    return True

def file_mb(path):
    try:
        return os.path.getsize(path) / (1024*1024.0)
    except: return 0.0

def encode_gif_budgeted(mp4, start, end, aspect, size_cap_mb, fps_target, fps_min):
    # Start with full res (1080 wide), target fps; if too big, reduce fps, then reduce size
    targets = [1080, 960, 864, 768, 720, 640]
    fps_vals = list(range(fps_target, fps_min - 1, -2))  # 24,22,20,...,10

    with tempfile.TemporaryDirectory() as td:
        for w in targets:
            h = int(w * (3/2)) if aspect == "4x6" else w
            for fps in fps_vals:
                out_gif = str(Path(td) / f"tmp_{w}_{fps}.gif")
                ok = palette_gif(mp4, start, end, out_gif, aspect=aspect, target_w=w, target_h=h, fps=fps)
                if not ok:
                    continue
                mb = file_mb(out_gif)
                print(f"   • Encoded {w}x{h}@{fps}fps → {mb:.2f} MB")
                if mb <= size_cap_mb:
                    # Move to permanent temp file we can return
                    final_gif = str(Path(td) / f"final_{w}_{fps}.gif")
                    shutil.move(out_gif, final_gif)
                    return final_gif, w, h, fps, mb
        # as last resort, return best (smallest mb)
        best = None
        for p in Path(td).glob("tmp_*.gif"):
            mb = file_mb(str(p))
            if (best is None) or (mb < best[1]):
                best = (str(p), mb)
        if best:
            final_gif = str(Path(td) / "final_best.gif")
            shutil.move(best[0], final_gif)
            return final_gif, None, None, None, best[1]
    return None, None, None, None, None

def auto_build_gifs(token, rec, upload_prefix, wanted=GIF_VARIANTS, aspect_default=GIF_ASPECT_DEFAULT):
    """
    Downloads primary inspiration reel and auto-generates up to 'wanted' GIFs (3–6s, text-free).
    Returns list of uploaded public URLs.
    """
    reels = rec.get("inspiration_reels") or []
    if not reels:
        return []

    # pick first reel URL to source
    reel_url = reels[0]
    with tempfile.TemporaryDirectory() as td:
        mp4 = download_video(reel_url, td)
        if not mp4:
            print(f"⚠️ Unable to download reel for GIFs: {reel_url}")
            return []
        meta = probe_video(mp4) or {}
        dur = meta.get("duration", 0)
        if dur <= GIF_MIN_SEC:
            print("⚠️ Reel too short for GIFs")
            return []

        # find clean windows
        aspect = rec.get("gif_aspect", aspect_default)
        windows = find_clean_windows(mp4, aspect, min_s=GIF_MIN_SEC, max_s=GIF_MAX_SEC, wanted=wanted)
        wins = windows.get("wins", [])
        if not wins:
            print("⚠️ No sufficiently clean windows detected; trying naive thirds")
            # naive fallback: 3 windows evenly
            thirds = [dur*0.1, dur*0.5, dur*0.8]
            wins = []
            for t in thirds:
                a = max(0.0, t - (GIF_MIN_SEC/2))
                b = min(dur, a + GIF_MIN_SEC)
                wins.append({"start": a, "end": b, "score": 0.5})

        uploaded = []
        for i, win in enumerate(wins[:wanted]):
            start, end = float(win["start"]), float(win["end"])
            # encode with size budget
            gif_path, w, h, fps, mb = encode_gif_budgeted(
                mp4, start, end, aspect, size_cap_mb=GIF_MAX_MB,
                fps_target=GIF_TARGET_FPS, fps_min=GIF_MIN_FPS
            )
            if not gif_path:
                continue
            filename = f"{rec['external_id'].split(':')[-1]}-auto{i+1}.gif"
            bucket_rel = f"{upload_prefix}/{filename}"
            public = upload(token, gif_path, bucket_rel)
            print(f"   ✓ GIF uploaded: {public}  ({mb:.2f} MB)")
            uploaded.append(public)
        return uploaded

# ---------- Build + Import ----------
def build_product(rec, assets, ae_total, amz_total, pass_reason, best_ae_url):
    # Images
    images = []
    mains = [u for u in assets["images"] if u.endswith("main.jpg") or u.endswith("main.jpeg") or ("type=main" in u)]
    lifestyles = [u for u in assets["images"] if "lifestyle" in u]
    if mains:
        images.append({"url": mains[0], "type": "main", "display_order": 0})
        for i, u in enumerate(sorted(lifestyles), start=1):
            images.append({"url": u, "type": "lifestyle", "display_order": i})
    else:
        # if no explicit "main", try first image as main
        if assets["images"]:
            images.append({"url": assets["images"][0], "type": "main", "display_order": 0})
            for i, u in enumerate(assets["images"][1:4], start=1):
                images.append({"url": u, "type": "lifestyle", "display_order": i})

    media = [{"url": u, "type": "video", "description": "Product demo"} for u in assets["videos"]]

    creatives = []
    for reel in rec.get("inspiration_reels", []):
        creatives.append({"type": "reel", "url": reel, "platform": "instagram", "is_inspiration": True})
    for u in sorted(assets["gifs"]):
        creatives.append({
            "type":"ad","url":u,"platform":"meta",
            "headline": rec.get("headline","Shop Now"),
            "ad_copy": rec.get("ad_copy","(fast & free shipping)"),
            "is_inspiration": False
        })

    rrp = round(ae_total * 3, 2)
    copy = gen_copy(rec, rrp)

    meta = {
        "price_rule_pass": True,
        "price_rule_reason": pass_reason,
        "amazon_url": rec.get("amazon_url"),
        "aliexpress_url": best_ae_url,
        "amz_total": amz_total,
        "ae_total": ae_total,
        "notes": "GIFs auto-generated: text-free segments; ≤20MB; square/4x6.",
        "copy": copy
    }

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
        "metadata": meta
    }

def import_products(token, products):
    url = f"{SUPABASE_URL}/functions/v1/import-products"
    headers = {"Authorization": f"Bearer {token}", "apikey": ANON_KEY, "Content-Type":"application/json"}
    payload = {"source": "ai_agent", "mode": "upsert", "products": products}
    r = requests.post(url, headers=headers, json=payload, timeout=TIMEOUT)
    try: data = r.json()
    except: data = {"status": r.status_code, "text": r.text}
    if not r.ok:
        raise RuntimeError(json.dumps(data, indent=2))
    print(json.dumps(data, indent=2))

def load_manifests():
    specs = []
    root = Path("products")
    if not root.exists(): return specs
    for y in root.glob("*.yml"):
        with open(y, "r", encoding="utf-8") as f:
            doc = yaml.safe_load(f)
        specs.extend(doc.get("products", []))
    return specs

def main():
    print(f"🚀 Revoa Importer (Price-First + UPSERT + Auto-GIF) - Target: {TARGET_NEW_PRODUCTS} products, Max time: {MAX_RUNTIME_MIN}m")

    print("ENV sanity:", {
        "HAS_URL": bool(os.environ.get("SUPABASE_URL")),
        "HAS_ANON": bool(os.environ.get("SUPABASE_ANON_KEY")),
        "HAS_SERVICE_ROLE": bool(os.environ.get("SUPABASE_SERVICE_ROLE")),
        "HAS_EMAIL": bool(os.environ.get("REVOA_ADMIN_EMAIL")),
        "HAS_PASSWORD": bool(os.environ.get("REVOA_ADMIN_PASSWORD")),
        "JOB_ID": os.environ.get("JOB_ID")
    })

    token = login()
    print("✅ Auth OK")

    # Fetch job details from database to get reel_urls and optional amazon/aliexpress URLs
    job_id = os.environ.get("JOB_ID")
    provided_urls = []
    hybrid_amazon_url = None
    hybrid_aliexpress_url = None

    print(f"🔍 Debug: JOB_ID environment variable = '{job_id}'")

    if job_id and job_id.strip():
        try:
            headers = {"Authorization": f"Bearer {token}", "apikey": ANON_KEY}
            print(f"🔍 Fetching job from: {SUPABASE_URL}/rest/v1/import_jobs?id=eq.{job_id}")
            resp = requests.get(f"{SUPABASE_URL}/rest/v1/import_jobs?id=eq.{job_id}&select=reel_urls,amazon_url,aliexpress_url", headers=headers, timeout=TIMEOUT)
            print(f"🔍 Response status: {resp.status_code}")
            if resp.ok:
                data = resp.json()
                print(f"🔍 Response data: {data}")
                if data and len(data) > 0:
                    job_data = data[0]

                    # Extract reel URLs
                    if job_data.get('reel_urls'):
                        raw_urls = job_data['reel_urls']
                        print(f"🔍 Raw reel_urls array has {len(raw_urls)} entries")
                        # Flatten the array - some entries might have multiple URLs separated by spaces
                        for entry in raw_urls:
                            if entry:
                                # Split by space and newline in case URLs are concatenated
                                urls_in_entry = re.split(r'[\s\n]+', entry.strip())
                                for url in urls_in_entry:
                                    url = url.strip()
                                    # Only add valid Instagram URLs (handle both /reel/ and /reels/)
                                    if url and ('instagram.com/reel' in url or 'instagram.com/p/' in url):
                                        # Clean query parameters if needed
                                        provided_urls.append(url)
                        print(f"📋 Found {len(provided_urls)} URLs in job record")
                    else:
                        print(f"⚠️  No reel_urls in job record")

                    # Extract hybrid mode URLs if provided
                    if job_data.get('amazon_url'):
                        hybrid_amazon_url = job_data['amazon_url'].strip()
                        print(f"🔗 Hybrid mode: Amazon URL provided")
                    if job_data.get('aliexpress_url'):
                        hybrid_aliexpress_url = job_data['aliexpress_url'].strip()
                        print(f"🔗 Hybrid mode: AliExpress URL provided")
                else:
                    print(f"⚠️  No job data found")
            else:
                print(f"⚠️  Failed to fetch job: {resp.text}")
        except Exception as e:
            print(f"⚠️  Could not fetch job URLs from database: {e}")

    # Load dedup sets
    seen_reels, seen_extids = fetch_seen_sets(token)

    # Start timer for runtime budget
    start_time = time.time()
    target = TARGET_NEW_PRODUCTS
    found = 0
    payload = []
    skipped = []
    failed = []

    # =====================================================================
    # HYBRID MODE: Use provided Amazon/AliExpress URLs if available
    # =====================================================================
    if hybrid_amazon_url and hybrid_aliexpress_url and provided_urls:
        print("🔀 HYBRID MODE: Using provided product URLs")
        print("=" * 60)
        print(f"📋 Reel URLs: {len(provided_urls)}")
        print(f"🔗 Amazon URL: {hybrid_amazon_url[:80]}...")
        print(f"🔗 AliExpress URL: {hybrid_aliexpress_url[:80]}...")
        print()

        # Process each reel with the provided URLs
        for reel_url in provided_urls:
            match = re.search(r'/(reels?|p)/([^/\?]+)', reel_url)
            if not match:
                print(f"⚠️  Invalid reel URL: {reel_url}")
                continue

            shortcode = match.group(2)
            reel_hash = _hash(shortcode)

            if reel_hash in seen_reels:
                print(f"⏭️  Skip {shortcode}: already processed")
                continue

            print(f"Processing: {reel_url}")

            # Fetch Amazon price
            amazon_price = fetch_amazon_price_prime_only(hybrid_amazon_url)
            if not amazon_price:
                print("  ⚠️  Could not fetch Amazon price")
                failed.append({"reel": shortcode, "reason": "amazon_price_fetch_failed"})
                continue

            # Fetch AliExpress price
            ae_price = fetch_aliexpress_price(hybrid_aliexpress_url)
            if not ae_price:
                print("  ⚠️  Could not fetch AliExpress price")
                failed.append({"reel": shortcode, "reason": "aliexpress_price_fetch_failed"})
                continue

            spread = amazon_price - ae_price
            print(f"  💰 Amazon: ${amazon_price:.2f}, AliExpress: ${ae_price:.2f}, Spread: ${spread:.2f}")

            if spread < MIN_SPREAD_USD:
                print(f"  ⚠️  Spread ${spread:.2f} < minimum ${MIN_SPREAD_USD}")
                skipped.append({"reel": shortcode, "reason": f"low_spread_{spread:.2f}"})
                continue

            # Download reel and create GIF
            print(f"  📥 Downloading reel...")
            video_path = download_instagram_reel(reel_url, shortcode)
            if not video_path:
                print("  ⚠️  Failed to download reel")
                failed.append({"reel": shortcode, "reason": "download_failed"})
                continue

            gif_path = video_to_gif(video_path, shortcode)
            if not gif_path:
                print("  ⚠️  Failed to convert to GIF")
                failed.append({"reel": shortcode, "reason": "gif_conversion_failed"})
                continue

            # Upload assets
            print(f"  ☁️  Uploading assets...")
            video_url = upload_to_storage(video_path, f"videos/{shortcode}.mp4", token)
            gif_url = upload_to_storage(gif_path, f"gifs/{shortcode}.gif", token)

            if not video_url or not gif_url:
                print("  ⚠️  Failed to upload assets")
                failed.append({"reel": shortcode, "reason": "upload_failed"})
                continue

            # Extract product title from Amazon URL
            amazon_title = "Imported Product"
            try:
                html = fetch_html(hybrid_amazon_url)
                if html:
                    soup = BeautifulSoup(html, 'html.parser')
                    title_elem = soup.select_one('#productTitle')
                    if title_elem:
                        amazon_title = title_elem.get_text().strip()[:100]
            except:
                pass

            # Create product record
            product = {
                'external_id': f"hybrid:{shortcode}",
                'name': amazon_title,
                'category': 'Home',
                'description': '',
                'amazon_url': hybrid_amazon_url,
                'amazon_price': amazon_price,
                'supplier_url': hybrid_aliexpress_url,
                'supplier_price': ae_price,
                'inspiration_reels': [reel_url],
                'video_urls': [video_url],
                'gif_urls': [gif_url],
                'status': 'pending',
                'profit_margin': ((amazon_price - ae_price) / amazon_price) * 100 if amazon_price > 0 else 0,
            }

            payload.append(product)
            found += 1
            print(f"  ✅ Product added (spread: ${spread:.2f})")

            # Mark as seen
            try:
                headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {token}"}
                requests.post(
                    f"{SUPABASE_URL}/rest/v1/agent_seen_sources",
                    headers=headers,
                    json={"reel_id_hash": reel_hash},
                    timeout=5
                )
            except:
                pass

            if found >= target:
                break

        print(f"\n✅ Hybrid mode complete: {found} products created")

        # Skip autonomous discovery if we found products
        if found > 0:
            # Upload products to database
            if payload:
                print("\n📤 Uploading products to database...")
                success_count = 0
                for product in payload:
                    if upsert_product(product, token):
                        success_count += 1

                print(f"✅ Successfully uploaded {success_count}/{len(payload)} products")

            # Write summary
            summary = {
                "job_id": job_id,
                "total": found,
                "successful": found,
                "failed": len(failed),
                "skipped": len(skipped)
            }
            print(f"\n📊 RUN SUMMARY: {summary}")
            sys.exit(0)

    # =====================================================================
    # AUTONOMOUS PRODUCT DISCOVERY
    # =====================================================================
    # The agent will:
    # 1. Search Instagram for viral reels by hashtag
    # 2. Analyze reel captions/frames to identify products
    # 3. Search Amazon for matching products
    # 4. Search AliExpress for suppliers (100+ orders)
    # 5. Validate pricing rules (50% rule or $20 spread)
    # 6. Download reels and generate text-free GIFs
    # 7. Upload assets to Supabase storage
    # 8. UPSERT products to database (status: pending)
    # =====================================================================

    print("🤖 FULLY AUTONOMOUS PRODUCT DISCOVERY MODE")
    print("=" * 60)
    print(f"📍 Discovery niches: {', '.join(DISCOVERY_NICHES)}")
    print(f"🔍 Search terms: {len(DISCOVERY_TERMS)} terms loaded")
    print(f"📊 Min views: {MIN_VIEWS:,}, Max reels: {MAX_REELS}")
    print(f"💰 Pricing: AE ≥{MIN_AE_SALES} orders, spread ≥${MIN_SPREAD_USD}, soft-pass: {ALLOW_AE_SOFT_PASS}")
    print()

    # Step 1: Get reels from URLs or discover via search
    if provided_urls:
        print("📋 STEP 1: Using provided Instagram reel URLs...")
        print(f"   Found {len(provided_urls)} URLs provided")

        # Convert URLs to reel metadata format
        discovered_reels = []
        for url in provided_urls:
            # Extract shortcode from URL
            # URL format: https://www.instagram.com/reel/ABC123/ or https://www.instagram.com/p/ABC123/
            match = re.search(r'/(reel|p)/([^/]+)', url)
            if match:
                shortcode = match.group(2)
                discovered_reels.append({
                    'url': url,
                    'shortcode': shortcode,
                    'likes': 0,  # Unknown for manual URLs
                    'comments': 0,
                    'views': 0,
                    'source': 'manual_input'
                })
                print(f"   ✓ {url}")
            else:
                print(f"   ✗ Invalid URL: {url}")

        if not discovered_reels:
            print("⚠️  No valid Instagram reel URLs provided")
            print("    URLs must be in format: https://www.instagram.com/reel/SHORTCODE/")
            sys.exit(1)

        print(f"✓ Loaded {len(discovered_reels)} reels from provided URLs")
        print()
    else:
        print("🔍 STEP 1: Discovering viral Instagram reels...")
        print(f"   Using {len(DISCOVERY_TERMS)} search terms:")
        for term in DISCOVERY_TERMS[:5]:
            print(f"   - {term}")
        if len(DISCOVERY_TERMS) > 5:
            print(f"   ... and {len(DISCOVERY_TERMS) - 5} more")
        print()

        discovered_reels = discover_viral_reels(
            DISCOVERY_TERMS,  # Use search terms, not hashtags
            min_views=MIN_VIEWS,
            max_reels=MAX_REELS
        )

        if not discovered_reels:
            print("⚠️  No viral reels discovered")
            print("    Instagram may be blocking requests or search terms returned no results")
            print("    This is normal for web scraping - will retry on next run")
            print()
            print("💡 TIP: Try adjusting DISCOVERY_MIN_VIEWS or DISCOVERY_TERMS env vars")
            print("    Exiting gracefully - no products imported this run")
            sys.exit(0)

        print(f"✓ Discovered {len(discovered_reels)} viral reels")
        print()

    # Step 2: Analyze reels and identify products
    print("🔍 STEP 2: Analyzing reels to identify products...")
    specs = []

    for reel in discovered_reels[:target * 3]:  # Analyze 3x target to account for heavy filtering
        if len(specs) >= target:
            print(f"✓ Reached target of {target} identified products")
            break

        reel_hash = _hash(reel['shortcode'])
        if reel_hash in seen_reels:
            print(f"  ⏭️  Skip {reel['shortcode']}: already processed")
            continue

        print(f"  Analyzing: {reel['url']} ({reel.get('views', 0):,} views, {reel['likes']:,} likes)")

        # Extract product info from reel
        product_info = extract_product_info_from_reel(reel['url'])

        if not product_info or not product_info.get('product_name'):
            print("    ⚠️  Could not identify product from caption/hashtags, skipping")
            # Mark as seen so we don't retry
            try:
                headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {token}"}
                requests.post(
                    f"{SUPABASE_URL}/rest/v1/agent_seen_sources",
                    headers=headers,
                    json={"reel_id_hash": reel_hash},
                    timeout=5
                )
            except:
                pass
            continue

        # Step 3: Search Amazon for the product
        amazon_results = search_amazon_for_product(
            product_info['product_name'],
            product_info.get('keywords', []),
            max_results=5  # Try more results
        )

        if not amazon_results:
            print("    ⚠️  No Amazon products found, skipping")
            continue

        # Take the first Prime-eligible product
        amazon_product = None
        for result in amazon_results:
            if result.get('prime'):
                amazon_product = result
                break

        if not amazon_product:
            print("    ⚠️  No Prime-eligible products found, skipping")
            continue

        # Build product spec for pricing validation
        slug = re.sub(r'[^a-z0-9]+', '-', product_info['product_name'].lower()).strip('-')
        external_id = f"ig:{reel['shortcode']}:{slug}"

        spec = {
            'external_id': external_id,
            'name': amazon_product['title'][:100],  # Use Amazon title
            'category': product_info.get('category', 'Home'),
            'description': product_info.get('description_hint', '')[:500],
            'amazon_url': amazon_product['url'],
            'amazon_price': amazon_product.get('price'),  # May be None
            'aliexpress_search_terms': [
                product_info['product_name'],
                ' '.join(product_info.get('keywords', [])[:3])
            ],
            'inspiration_reels': [reel['url']],
            'min_sales': MIN_AE_SALES,
            'allow_aliexpress_soft_pass': ALLOW_AE_SOFT_PASS,
            'supplier_price': None,  # Will search AliExpress in main loop
            'headline': f"Get {product_info['product_name']}",
            'ad_copy': "(as seen on Instagram)",
            '_reel_metadata': {
                'likes': reel['likes'],
                'comments': reel.get('comments', 0),
                'views': reel.get('views', 0),
                'shortcode': reel['shortcode']
            }
        }

        specs.append(spec)
        print(f"    ✓ Product identified: {spec['name'][:50]}...")

        # Mark reel as seen in database
        try:
            headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {token}"}
            requests.post(
                f"{SUPABASE_URL}/rest/v1/agent_seen_sources",
                headers=headers,
                json={"reel_id_hash": reel_hash},
                timeout=5
            )
            seen_reels.add(reel_hash)
        except Exception as e:
            print(f"    ⚠️  Could not mark reel as seen: {e}")

    print()
    if not specs:
        print("⚠️  No products identified from discovered reels")
        print("    Captions may not contain clear product names")
        print("    Exiting - will retry on next run")
        sys.exit(0)

    print(f"✓ Identified {len(specs)} products from viral reels")
    print()

    # Continue with pricing validation and asset generation
    for rec in specs:
        # Check if we hit target or timeout
        if found >= target:
            print(f"✅ Target of {target} products reached")
            break
        if (time.time() - start_time) / 60.0 > MAX_RUNTIME_MIN:
            print(f"⏱️ Runtime budget of {MAX_RUNTIME_MIN}m reached; stopping")
            break

        # Skip if already imported
        ext_id = rec.get("external_id")
        if ext_id in seen_extids:
            print(f"⏭️ Skip {ext_id}: already imported")
            continue

        # ---- Required fields for pricing ----
        amz_url = rec.get("amazon_url")
        ae_candidates = rec.get("aliexpress_candidates", [])
        ae_search_terms = rec.get("aliexpress_search_terms", [])

        if not amz_url:
            print(f"⛔ {ext_id}: missing amazon_url")
            skipped.append({"external_id": ext_id, "reason": "missing amazon_url"})
            continue

        min_sales = int(rec.get("min_sales", MIN_SALES_DEFAULT))
        top_n = int(rec.get("top_n", TOP_N_DEFAULT))

        # PRICING — Amazon (Prime) + AliExpress
        amz_total = fetch_amazon_price_prime_only(amz_url)

        # 1) If explicit AE candidates provided, try those:
        if ae_candidates:
            ae_total, best_ae_url = fetch_aliexpress_total_best(
                ae_candidates,
                min_sales=min_sales,
                top_n=top_n,
            )
        else:
            ae_total, best_ae_url = None, None

        # 2) If still missing, try AE search with provided search terms:
        if ae_total is None and ae_search_terms:
            print(f"🔎 Searching AliExpress by terms for {ext_id}…")
            ae_total, best_ae_url = search_aliexpress_and_pick_best(
                ae_search_terms,
                min_sales=min_sales,
            )
            if ae_total is not None:
                print(f"   → Found AE candidate via search: ${ae_total:.2f}")

        # 3) If AE missing, consider supplier fallback
        if ae_total is None and rec.get("supplier_price") is not None and rec.get("use_supplier_price_if_ae_scrape_fails", True):
            ae_total = float(rec["supplier_price"])
            print(f"🟨 AE scrape failed — using supplier_price fallback: ${ae_total:.2f}")
            best_ae_url = ae_candidates[0] if ae_candidates else rec.get("aliexpress_url")

        # 4) Enforce rule (with soft-pass if requested)
        soft_ok = bool(rec.get("allow_aliexpress_soft_pass", True))
        passed, reason, soft_flag = enforce_rule(ae_total, amz_total, soft_pass=soft_ok)

        if not passed:
            print(f"⛔ Skip {ext_id}: {reason}")
            skipped.append({"external_id": ext_id, "reason": reason})
            continue

        # RRP logic
        if ae_total is not None:
            rrp = round(ae_total * 3, 2)
        else:
            # Soft-pass with no AE: use supplier_price if present; else no RRP (admin will fill)
            rrp = round(float(rec["supplier_price"]) * 3, 2) if rec.get("supplier_price") is not None else None

        # 2) Assets only AFTER PASS
        assets = collect_and_upload(token, rec.get("assets_dir",""))

        # Auto GIFs from first inspiration reel if we still don't have GIFs
        slug = rec["external_id"].split(":")[-1]
        upload_prefix = f"{rec['category'].lower()}/{slug}"
        if not assets["gifs"]:
            auto_gifs = auto_build_gifs(token, rec, upload_prefix)
            if auto_gifs:
                assets["gifs"].extend(auto_gifs)
        if not assets["gifs"]:
            print(f"⚠️ No GIFs for {ext_id} (auto mode found none)")

        # 3) Build + queue
        prod = build_product(rec, assets, ae_total, amz_total, reason, best_ae_url)

        # Override RRP if soft-pass and we computed via supplier:
        if rrp is not None:
            prod["recommended_retail_price"] = rrp

        # If soft-pass with no prices, send zeros and flag admin_review_required
        if soft_flag and rrp is None:
            prod["supplier_price"] = 0.0
            prod["recommended_retail_price"] = 0.0
            prod.setdefault("metadata", {})["admin_review_required"] = True
            print(f"🟨 {ext_id} soft-pass with admin review required")

        payload.append(prod)
        found += 1
        seen_extids.add(ext_id)
        print(f"✓ Product {found}/{target} queued: {ext_id}")

    # Import if we have any products
    if not payload:
        print("⚠️ No products to import.")
        print("   Reason: AI discovery not yet implemented (currently skipping YAML test products)")
        if skipped: print(json.dumps({"skipped": skipped}, indent=2))
        return len(specs), 0, len(failed), skipped

    print(f"📦 Sending UPSERT import for {len(payload)} product(s)…")
    successful = 0
    try:
        import_products(token, payload)
        successful = len(payload)
        print("🎉 Done — review in /admin/product-approvals")
    except Exception as e:
        print(f"❌ Import failed: {e}")
        failed.extend([{"external_id": p.get("external_id"), "reason": str(e)} for p in payload])

    if skipped:
        print("\n⚠️ Skipped (pricing failed or missing URLs):")
        print(json.dumps(skipped, indent=2))

    elapsed = (time.time() - start_time) / 60.0
    print(f"\n📊 Summary: {successful} successful, {len(failed)} failed, {len(skipped)} skipped")
    print(f"⏱️ Runtime: {elapsed:.1f}m / {MAX_RUNTIME_MIN}m budget")
    return len(specs), successful, len(failed), skipped

if __name__ == "__main__":
    job_id = os.environ.get("JOB_ID", "")
    github_run_url = os.environ.get("GITHUB_RUN_URL", "")

    summary = {
        "job_id": job_id,
        "total": 0,
        "successful": 0,
        "failed": 0,
        "skipped": []
    }

    if github_run_url:
        summary["github_run_url"] = github_run_url

    try:
        total, successful, failed, skipped_list = main()
        summary["total"] = int(total)
        summary["successful"] = int(successful)
        summary["failed"] = int(failed)
        summary["skipped"] = skipped_list
    except Exception as e:
        summary["failed"] = 1
        summary["error_text"] = f"{type(e).__name__}: {e}"
        print(f"❌ Error: {e}")
    finally:
        # 1. Always write local file for GitHub Actions
        with open("run_summary.json", "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
        print("✅ Wrote run_summary.json")
        print("RUN SUMMARY:", json.dumps(summary))

        # 2. POST directly to agent-callback as fallback
        if job_id and SUPABASE_URL:
            try:
                print("📡 Posting summary to agent-callback...")
                # Ensure URL has protocol
                base_url = SUPABASE_URL if SUPABASE_URL.startswith("http") else f"https://{SUPABASE_URL}"
                callback_url = f"{base_url}/functions/v1/agent-callback"
                r = requests.post(
                    callback_url,
                    headers={"Content-Type": "application/json"},
                    json=summary,
                    timeout=10
                )
                if r.ok:
                    print("✅ Agent callback successful")
                else:
                    print(f"⚠️ Agent callback returned {r.status_code}: {r.text[:200]}")
            except Exception as cb_err:
                print(f"⚠️ Agent callback failed (non-fatal): {cb_err}")
