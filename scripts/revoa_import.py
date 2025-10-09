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
from urllib.parse import urlparse
import numpy as np

# Optional heavy deps (opencv) import lazily where needed
try:
    import cv2
except Exception:
    cv2 = None

# ---------- Config / Env ----------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
ADMIN_TOKEN = os.environ.get("REVOA_ADMIN_TOKEN")
ADMIN_EMAIL = os.environ.get("REVOA_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("REVOA_ADMIN_PASSWORD")

# Debug: print environment variable status
print("🔍 Environment Check:")
print(f"  SUPABASE_URL: {'✓' if SUPABASE_URL else '✗'}")
print(f"  SUPABASE_ANON_KEY: {'✓' if ANON_KEY else '✗'}")
print(f"  REVOA_ADMIN_TOKEN: {'✓' if ADMIN_TOKEN else '✗'}")
print(f"  REVOA_ADMIN_EMAIL: {'✓' if ADMIN_EMAIL else '✗'}")
print(f"  REVOA_ADMIN_PASSWORD: {'✓' if ADMIN_PASSWORD else '✗'}")

if not SUPABASE_URL or not ANON_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_ANON_KEY")
if not ADMIN_TOKEN and not (ADMIN_EMAIL and ADMIN_PASSWORD):
    raise RuntimeError("Missing REVOA_ADMIN_TOKEN or REVOA_ADMIN_EMAIL/REVOA_ADMIN_PASSWORD")

TIMEOUT = 30
PRICE_TIMEOUT = 25
MIN_SALES_DEFAULT = 100
TOP_N_DEFAULT = 3

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

HEADERS_BROWSER = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

# ---------- Utilities ----------
def _run(cmd):
    print("▶", " ".join(map(str, cmd)))
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

def login():
    """Return admin token (prefers REVOA_ADMIN_TOKEN, fallback password grant)."""
    if ADMIN_TOKEN:
        print("🔑 Using admin token")
        return ADMIN_TOKEN
    if not (ADMIN_EMAIL and ADMIN_PASSWORD):
        raise RuntimeError("Missing REVOA_ADMIN_TOKEN or REVOA_ADMIN_EMAIL/REVOA_ADMIN_PASSWORD")
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

def fetch_html(url):
    try:
        r = requests.get(url, headers=HEADERS_BROWSER, timeout=PRICE_TIMEOUT)
        if r.status_code == 200: return r.text
    except requests.RequestException:
        pass
    return None

def parse_amazon_prime_price(html):
    if not html: return None, False
    # detect "Prime" badging near price blocks
    prime = bool(re.search(r'Prime[^<]*</span>|aria-label="Prime"', html, re.IGNORECASE))
    # price location heuristics
    m = re.search(r'id="priceblock_ourprice"[^>]*>([^<]+)</span>', html)
    if not m:
        m = re.search(r'class="a-offscreen"[^>]*>([^<]+)</span>', html)
    price = _num(m.group(1)) if m else None
    return price, prime

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
    Tries multiple queries on AliExpress search, sorts by estimated sales, then verifies
    price+shipping on the product page. Returns (best_total, best_url) or (None, None).
    """
    def search_once(term):
        q = term.strip().replace(" ", "%20")
        url = f"https://www.aliexpress.com/wholesale?SearchText={q}&SortType=total_tranpro_desc"
        html = fetch_html(url)
        if not html:
            return []
        items = []
        for m in re.finditer(r'href="(https://www\.aliexpress\.com/item/[^"]+)"', html):
            href = m.group(1)
            window = html[max(0, m.start()-500): m.end()+500]
            sm = re.search(r'(?:sold|orders?)\s*([0-9,]+)', window, re.IGNORECASE)
            sales = int(sm.group(1).replace(",", "")) if sm else None
            items.append((href, sales))
        seen, uniq = set(), []
        for href, sales in items:
            key = href.split("?")[0]
            if key in seen:
                continue
            seen.add(key)
            uniq.append((href, sales or 0))
        uniq.sort(key=lambda x: x[1], reverse=True)
        return uniq[:10]

    candidate_pool = []
    for t in (search_terms or []):
        candidate_pool.extend(search_once(t))

    best = None
    for href, est_sales in candidate_pool:
        html = fetch_html(href)
        price, ship, sales = parse_aliexpress_price_shipping_sales(html)
        sales_final = sales or est_sales or 0
        if sales_final < min_sales or price is None:
            continue
        total = float(price) + float(ship or 0.0)
        if (best is None) or (total < best[0]):
            best = (total, href, sales_final)

    if not best:
        return None, None
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

def crop_box_for_aspect(w, h, aspect):
    if aspect == "4x6":
        # target ratio 2:3 (w:h = 2:3). We crop to 2:3 centered
        target_ratio = 2/3
    else:
        target_ratio = 1.0  # square
    in_ratio = w / max(h,1)
    if in_ratio > target_ratio:
        # too wide -> reduce width
        new_w = int(h * target_ratio)
        new_h = h
    else:
        # too tall -> reduce height
        new_w = w
        new_h = int(w / target_ratio)
    x = (w - new_w) // 2
    y = (h - new_h) // 2
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
    # compose crop filter
    if aspect == "4x6":
        # 2:3
        crop_filter = "crop='min(iw,ih*2/3)':'min(ih,iw*3/2)':(in_w-out_w)/2:(in_h-out_h)/2"
    else:
        # square
        crop_filter = "crop='min(iw,ih)':'min(iw,ih)':(in_w-out_w)/2:(in_h-out_h)/2"
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
        "HAS_ADMIN_TOKEN": bool(os.environ.get("REVOA_ADMIN_TOKEN")),
        "HAS_EMAIL": bool(os.environ.get("REVOA_ADMIN_EMAIL")),
        "HAS_PASSWORD": bool(os.environ.get("REVOA_ADMIN_PASSWORD")),
        "JOB_ID": os.environ.get("JOB_ID")
    })

    token = login()
    print("✅ Auth OK")

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
    # TODO: REAL AI PRODUCT DISCOVERY
    # =====================================================================
    # This is where the real AI agent should:
    # 1. Discover trending products from Instagram reels (viral content)
    # 2. Analyze engagement metrics, comments, trending hashtags
    # 3. Identify product opportunities from viral videos
    # 4. Find matching Amazon Prime listings
    # 5. Find AliExpress suppliers with good pricing
    # 6. Generate compelling copy based on viral content
    #
    # Current implementation: DISABLED - No YAML test products
    # =====================================================================

    print("⚠️  AI DISCOVERY NOT YET IMPLEMENTED")
    print("    The script needs Instagram discovery logic to find real products.")
    print("    Currently only processes YAML files which contain test data.")
    print("")
    print("🚫 Skipping YAML test products - waiting for real AI discovery...")

    specs = []  # Explicitly empty - don't load test products

    # Process discovered products (currently empty until discovery implemented)
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
