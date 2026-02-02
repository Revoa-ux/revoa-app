#!/usr/bin/env python3
"""
Hybrid product importer:
Admin supplies product name, reel URL, Amazon URL, and AliExpress URL.
The agent does:
  - Download reel and produce 3 GIFs (2–5s, no text)
  - Extract a main image (1080×1080 light grey background)
  - Scrape Amazon Prime price and AliExpress total price (item + shipping)
  - Enforce pricing rule: AE_total ≤ 50% of Amazon_total OR spread ≥ $20
  - Generate product description and ad copy from templates
  - Upload assets to Supabase Storage
  - UPSERT product via Supabase function

Requires: yt-dlp, ffmpeg, requests, BeautifulSoup, openCV or moviepy.
"""

import os, re, json, requests, subprocess, pathlib, tempfile, shutil
from bs4 import BeautifulSoup

SUPABASE_URL   = os.environ["SUPABASE_URL"]
ANON_KEY       = os.environ["SUPABASE_ANON_KEY"]
ADMIN_TOKEN    = os.environ.get("REVOA_ADMIN_TOKEN")
ADMIN_EMAIL    = os.environ.get("REVOA_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("REVOA_ADMIN_PASSWORD")

TIMEOUT = 30

def login():
    if ADMIN_TOKEN:
        return ADMIN_TOKEN
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": ANON_KEY, "Content-Type":"application/json"},
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=TIMEOUT
    )
    resp.raise_for_status()
    return resp.json()["access_token"]

def download_reel_mp4(url: str, dest_dir: pathlib.Path) -> pathlib.Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    out_tpl = str(dest_dir / "%(id)s.%(ext)s")
    subprocess.run(["yt-dlp", "-f", "mp4", "-o", out_tpl, url], check=True)
    files = list(dest_dir.glob("*.mp4"))
    if not files:
        raise RuntimeError("yt-dlp failed: no mp4 downloaded")
    return files[0]

def extract_main_image(video_path: pathlib.Path, output_path: pathlib.Path):
    tmp = output_path.with_suffix(".jpg")
    duration = float(subprocess.check_output(
        ["ffprobe","-v","error","-select_streams","v:0",
         "-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",
         str(video_path)]).decode().strip())
    mid = max(0, duration / 2 - 0.5)
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(mid), "-t", "0.1", "-i", str(video_path),
        "-vf", "scale=1080:-1:force_original_aspect_ratio=decrease,pad=1080:1080:(1080-iw)/2:(1080-ih)/2:color=0xF5F5F5",
        "-frames:v", "1", str(tmp)
    ], check=True)
    shutil.move(tmp, output_path)

def make_gifs(video_path: pathlib.Path, out_dir: pathlib.Path):
    duration = float(subprocess.check_output(
        ["ffprobe","-v","error","-select_streams","v:0",
         "-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",
         str(video_path)]).decode().strip())
    clip_dur = max(2.0, min(5.0, duration * 0.5))
    starts = [0.1 * duration, 0.5 * duration, 0.8 * duration]
    gifs = []
    out_dir.mkdir(parents=True, exist_ok=True)
    idx = 1
    for s in starts[:3]:
        gif_out = out_dir / f"gif-{idx}.gif"
        vf = ("crop=in_w:in_h*0.76:0:in_h*0.12,"
              "scale=1080:-1:force_original_aspect_ratio=decrease,"
              "pad=1080:1080:(1080-iw)/2:(1080-ih)/2:color=0xF5F5F5,"
              "fps=15")
        pal = out_dir / f"pal-{idx}.png"
        subprocess.run(["ffmpeg","-y","-ss",str(s),"-t",str(clip_dur),
            "-i",str(video_path),
            "-vf",vf+",palettegen", "-frames:v","1", str(pal)], check=True)
        subprocess.run(["ffmpeg","-y","-ss",str(s),"-t",str(clip_dur),
            "-i",str(video_path), "-i", str(pal),
            "-lavfi",vf+"[x];[x][1:v]paletteuse=dither=sierra2_4a",
            "-loop","0", str(gif_out)], check=True)
        gifs.append(gif_out)
        idx += 1
    return gifs

def scrape_amazon_price(url: str):
    html = requests.get(url, headers={"User-Agent":"Mozilla/5.0"}, timeout=TIMEOUT).text
    soup = BeautifulSoup(html, "html.parser")
    price = None
    prime = bool(soup.find("span", {"class":"a-icon-prime"}))
    selectors = [
        ("span", {"id":"priceblock_ourprice"}),
        ("span", {"id":"priceblock_dealprice"}),
        ("span", {"class":"a-offscreen"}),
    ]
    for tag, attrs in selectors:
        el = soup.find(tag, attrs)
        if el and re.search(r"\$?\d", el.text):
            price_str = re.sub(r"[^\d\.]", "", el.text)
            try:
                price = float(price_str)
                break
            except ValueError:
                continue
    return (price, prime)

def scrape_aliexpress_total(url: str):
    html = requests.get(url, headers={"User-Agent":"Mozilla/5.0"}, timeout=TIMEOUT).text
    soup = BeautifulSoup(html, "html.parser")
    price = None
    m = re.search(r'"price"\s*:\s*"(\d+(\.\d+)?)"', html)
    if m:
        price = float(m.group(1))
    shipping = 0.0
    free = soup.find(text=re.compile("Free Shipping", re.IGNORECASE))
    if not free:
        m2 = re.search(r"\$([\d\.]+)\s*shipping", html)
        if m2:
            shipping = float(m2.group(1))
    return price, shipping

def upload_file(token: str, file_path: pathlib.Path, bucket_rel_path: str):
    with open(file_path, "rb") as f:
        r = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/product-assets/{bucket_rel_path}",
            headers={"Authorization": f"Bearer {token}", "apikey": ANON_KEY},
            files={"file": f})
    return f"{SUPABASE_URL}/storage/v1/object/public/product-assets/{bucket_rel_path}"

def build_copy(name: str, category: str, price: float):
    titles = [
        f"{name} – elevate your {category.lower()}",
        f"Upgrade your {category.lower()} with {name}",
        f"{name} • DIY made easy"
    ]
    descs = [
        "Install in minutes with no wiring.",
        f"Perfect addition to your {category.lower()}, weather-resistant and durable.",
        "Peel, stick and enjoy – a stylish upgrade!"
    ]
    ads = {
        "headlines": [
            "35% off + Free Shipping",
            "Limited-time offer – Don't miss out",
            f"Transform your {category.lower()} space today"
        ],
        "primary_text": [
            f"Today only! Get {name} and save big.",
            f"Your {category.lower()} project isn't complete without these.",
            "Why wait? Improve your home now."
        ],
        "descriptions": ["Fast & free shipping", "Easy install", "Satisfaction guaranteed"]
    }
    return titles, descs, ads

def import_product(token: str, product_payload: dict):
    r = requests.post(
        f"{SUPABASE_URL}/functions/v1/import-products",
        headers={"Authorization": f"Bearer {token}",
                 "apikey": ANON_KEY,
                 "Content-Type":"application/json"},
        json={"source": "ai_agent", "mode": "upsert", "products":[product_payload]})
    return r.json()

def main():
    manifest = {
        "name": os.environ["PROD_NAME"],
        "category": os.environ.get("PROD_CATEGORY", "Home & Garden"),
        "reel_url": os.environ["PROD_REEL"],
        "amazon_url": os.environ.get("PROD_AMZ",""),
        "amazon_price": os.environ.get("PROD_AMZ_PRICE",""),
        "aliexpress_url": os.environ.get("PROD_AE",""),
        "aliexpress_price": os.environ.get("PROD_AE_PRICE",""),
        "soft_pass": os.environ.get("SOFT_PASS","true").lower() == "true",
    }

    token = login()
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = pathlib.Path(tmpdir)
        video = download_reel_mp4(manifest["reel_url"], tmpdir)
        main_img = tmpdir/"main.jpg"
        extract_main_image(video, main_img)
        gifs_dir = tmpdir/"gifs"
        gifs = make_gifs(video, gifs_dir)

        amz_total, prime = (None, False)
        ae_total = None

        if manifest["amazon_price"]:
            try:
                amz_total = float(manifest["amazon_price"])
                prime = True
            except ValueError:
                pass
        elif manifest["amazon_url"]:
            price, prime = scrape_amazon_price(manifest["amazon_url"])
            if prime:
                amz_total = price

        if manifest["aliexpress_price"]:
            try:
                ae_total = float(manifest["aliexpress_price"])
            except ValueError:
                pass
        elif manifest["aliexpress_url"]:
            item, ship = scrape_aliexpress_total(manifest["aliexpress_url"])
            if item:
                ae_total = item + ship

        pass_rule = False
        reason = ""
        if ae_total is None or amz_total is None:
            if manifest["soft_pass"]:
                pass_rule = True
                reason = "Soft-pass (missing AE or Amazon price)"
            else:
                reason = "Missing AE or Amazon price"
        else:
            spread = amz_total - ae_total
            if (ae_total <= amz_total * 0.5) or (spread >= 20):
                pass_rule = True
                reason = f"PASS (AE ${ae_total:.2f} vs AMZ ${amz_total:.2f}; spread ${spread:.2f})"
            else:
                reason = f"FAIL (AE ${ae_total:.2f} vs AMZ ${amz_total:.2f})"

        if not pass_rule:
            print("Pricing failed:", reason)
            return

        cat = manifest["category"].lower()
        slug = re.sub(r"[^a-z0-9]+", "-", manifest["name"].lower()).strip("-")
        images = []
        main_pub = upload_file(token, main_img, f"{cat}/{slug}/main.jpg")
        images.append({"url": main_pub, "type":"main", "display_order": 0})

        creatives = []
        for i, gif in enumerate(gifs):
            pub_url = upload_file(token, gif, f"{cat}/{slug}/gif-{i+1}.gif")
            creatives.append({
                "type":"ad",
                "url": pub_url,
                "platform":"meta",
                "headline": f"{manifest['name']} – {i+1}",
                "ad_copy": "Fast & Free Shipping",
                "is_inspiration": False
            })

        creatives.insert(0, {
            "type":"reel",
            "url": manifest["reel_url"],
            "platform":"instagram",
            "is_inspiration": True
        })

        titles, descs, ads = build_copy(manifest["name"], manifest["category"], ae_total or amz_total)

        rrp = round((ae_total or amz_total) * 3, 2) if (ae_total or amz_total) else None

        product_payload = {
            "external_id": f"ig:{video.stem}:{slug}",
            "name": manifest["name"],
            "description": " ".join(descs),
            "category": manifest["category"],
            "supplier_price": ae_total,
            "recommended_retail_price": rrp,
            "images": images,
            "creatives": creatives,
            "metadata": {
                "price_rule_pass": True,
                "price_rule_reason": reason,
                "amazon_url": manifest.get("amazon_url"),
                "amz_total": amz_total,
                "aliexpress_url": manifest.get("aliexpress_url"),
                "ae_total": ae_total,
                "soft_pass": manifest["soft_pass"],
                "copy": {"titles": titles, "descriptions": descs, "ads": ads}
            }
        }

        result = import_product(token, product_payload)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
