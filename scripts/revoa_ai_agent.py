#!/usr/bin/env python3
"""
Revoa AI Agent - Hybrid Product Import Workflow

This script automates the complete product import process:
1. Downloads Instagram Reel and extracts video
2. Generates 3-5 GIFs from clean product-focused segments (no text/logos)
3. Scrapes high-resolution product images from Amazon and AliExpress
4. Processes images: removes backgrounds, adds neutral grey background
5. Optimizes images for Shopify (1080x1080 or 4:5 portrait)
6. Generates comprehensive marketing copy using OpenAI
7. Uploads all assets to Supabase Storage
8. Creates product entry in database via import-products endpoint

Requirements:
- yt-dlp for Instagram downloads
- ffmpeg for video/image processing
- OpenCV for text detection in video
- remove.bg API or Canva API for background removal
- OpenAI API for marketing copy generation
"""

import os
import re
import json
import sys
import requests
import subprocess
import pathlib
import tempfile
import shutil
from typing import Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
import cv2
import numpy as np

# Environment variables
SUPABASE_URL = os.environ["SUPABASE_URL"]
ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
ADMIN_TOKEN = os.environ.get("REVOA_ADMIN_TOKEN")
ADMIN_EMAIL = os.environ.get("REVOA_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("REVOA_ADMIN_PASSWORD")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
CANVA_API_KEY = os.environ.get("CANVA_API_KEY", "")

TIMEOUT = 30
MAX_IMAGE_SIZE_MB = 20


def login() -> str:
    """Authenticate with Supabase and return access token."""
    if ADMIN_TOKEN:
        return ADMIN_TOKEN

    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=TIMEOUT
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def download_reel_mp4(url: str, dest_dir: pathlib.Path) -> pathlib.Path:
    """Download Instagram Reel as MP4 using yt-dlp."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    out_tpl = str(dest_dir / "%(id)s.%(ext)s")

    subprocess.run([
        "yt-dlp",
        "-f", "mp4",
        "-o", out_tpl,
        "--no-check-certificate",
        url
    ], check=True, capture_output=True)

    files = list(dest_dir.glob("*.mp4"))
    if not files:
        raise RuntimeError(f"yt-dlp failed: no mp4 downloaded from {url}")

    return files[0]


def detect_text_in_frame(frame: np.ndarray) -> bool:
    """Detect if a video frame contains text overlays using edge detection."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)

    # Count edge pixels - text typically creates many edges
    edge_density = np.sum(edges > 0) / edges.size

    # If more than 15% of pixels are edges, likely contains text
    return edge_density > 0.15


def get_video_duration(video_path: pathlib.Path) -> float:
    """Get video duration in seconds."""
    result = subprocess.run([
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path)
    ], capture_output=True, text=True, check=True)

    return float(result.stdout.strip())


def extract_clean_segments(video_path: pathlib.Path, num_gifs: int = 3) -> List[Tuple[float, float]]:
    """
    Analyze video and extract clean segments without text or logos.
    Returns list of (start_time, duration) tuples.
    """
    duration = get_video_duration(video_path)
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS)

    # Sample frames throughout the video
    sample_times = np.linspace(0.1 * duration, 0.9 * duration, 20)
    clean_segments = []

    for t in sample_times:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ret, frame = cap.read()

        if ret and not detect_text_in_frame(frame):
            # Found clean frame, mark as potential GIF start
            clean_segments.append(t)

    cap.release()

    # If not enough clean segments found, use evenly spaced segments
    if len(clean_segments) < num_gifs:
        clean_segments = [
            0.2 * duration,
            0.5 * duration,
            0.75 * duration
        ]

    # Convert to (start, duration) tuples
    clip_duration = min(5.0, max(2.0, duration * 0.15))
    segments = [(t, clip_duration) for t in clean_segments[:num_gifs]]

    return segments


def create_gif(video_path: pathlib.Path, start_time: float, duration: float,
               output_path: pathlib.Path, crop_text: bool = True) -> None:
    """Create optimized GIF from video segment."""

    # Video filter: crop to remove text areas, resize to 1080x1080, add grey background
    if crop_text:
        vf = (
            "crop=in_w:in_h*0.76:0:in_h*0.12,"  # Remove top 12% and bottom 12%
            "scale=1080:-1:force_original_aspect_ratio=decrease,"
            "pad=1080:1080:(1080-iw)/2:(1080-ih)/2:color=0xF5F5F5,"
            "fps=15"
        )
    else:
        vf = (
            "scale=1080:-1:force_original_aspect_ratio=decrease,"
            "pad=1080:1080:(1080-iw)/2:(1080-ih)/2:color=0xF5F5F5,"
            "fps=15"
        )

    # Generate palette for better quality
    palette_path = output_path.with_suffix(".png")
    subprocess.run([
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-t", str(duration),
        "-i", str(video_path),
        "-vf", f"{vf},palettegen",
        "-frames:v", "1",
        str(palette_path)
    ], check=True, capture_output=True)

    # Create GIF using palette
    subprocess.run([
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-t", str(duration),
        "-i", str(video_path),
        "-i", str(palette_path),
        "-lavfi", f"{vf}[x];[x][1:v]paletteuse=dither=sierra2_4a",
        "-loop", "0",
        str(output_path)
    ], check=True, capture_output=True)

    # Clean up palette
    palette_path.unlink(missing_ok=True)


def make_gifs(video_path: pathlib.Path, out_dir: pathlib.Path, num_gifs: int = 3) -> List[pathlib.Path]:
    """Generate multiple GIFs from video, avoiding text overlays."""
    out_dir.mkdir(parents=True, exist_ok=True)
    segments = extract_clean_segments(video_path, num_gifs)

    gifs = []
    for idx, (start, duration) in enumerate(segments, 1):
        gif_path = out_dir / f"gif-{idx}.gif"
        create_gif(video_path, start, duration, gif_path)

        # Check file size
        size_mb = gif_path.stat().st_size / (1024 * 1024)
        if size_mb > MAX_IMAGE_SIZE_MB:
            print(f"Warning: GIF {idx} is {size_mb:.1f}MB, compressing...")
            # Reduce quality if too large
            compressed_path = out_dir / f"gif-{idx}-compressed.gif"
            subprocess.run([
                "ffmpeg", "-y",
                "-i", str(gif_path),
                "-vf", "scale=800:-1",
                str(compressed_path)
            ], check=True, capture_output=True)
            gif_path.unlink()
            compressed_path.rename(gif_path)

        gifs.append(gif_path)

    return gifs


def extract_main_image(video_path: pathlib.Path, output_path: pathlib.Path) -> None:
    """Extract a frame from video middle and format as 1080x1080 with grey background."""
    duration = get_video_duration(video_path)
    mid_time = max(0, duration / 2 - 0.5)

    tmp_frame = output_path.with_suffix(".tmp.jpg")

    subprocess.run([
        "ffmpeg", "-y",
        "-ss", str(mid_time),
        "-i", str(video_path),
        "-vf", "scale=1080:-1:force_original_aspect_ratio=decrease,pad=1080:1080:(1080-iw)/2:(1080-ih)/2:color=0xF5F5F5",
        "-frames:v", "1",
        "-qscale:v", "2",
        str(tmp_frame)
    ], check=True, capture_output=True)

    shutil.move(tmp_frame, output_path)


def scrape_amazon_images(url: str, dest_dir: pathlib.Path) -> List[pathlib.Path]:
    """Scrape high-resolution product images from Amazon."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    html = requests.get(url, headers=headers, timeout=TIMEOUT).text
    soup = BeautifulSoup(html, "html.parser")

    images = []
    img_tags = soup.find_all("img", {"class": re.compile("a-dynamic-image")})

    for idx, img in enumerate(img_tags[:5], 1):
        src = img.get("data-old-hires") or img.get("src")
        if not src or "data:image" in src:
            continue

        # Download image
        img_data = requests.get(src, headers=headers, timeout=TIMEOUT).content
        img_path = dest_dir / f"amazon-{idx}.jpg"
        img_path.write_bytes(img_data)
        images.append(img_path)

    return images


def scrape_aliexpress_images(url: str, dest_dir: pathlib.Path) -> List[pathlib.Path]:
    """Scrape high-resolution product images from AliExpress."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    html = requests.get(url, headers=headers, timeout=TIMEOUT).text

    # Find image URLs in page source
    img_urls = re.findall(r'https://[^"\']+\.alicdn\.com/[^"\']+\.(jpg|jpeg|png|webp)', html)
    img_urls = list(set(img_urls))  # Remove duplicates

    images = []
    for idx, img_url in enumerate(img_urls[:5], 1):
        try:
            img_data = requests.get(img_url, headers=headers, timeout=TIMEOUT).content
            img_path = dest_dir / f"aliexpress-{idx}.jpg"
            img_path.write_bytes(img_data)
            images.append(img_path)
        except Exception as e:
            print(f"Failed to download AliExpress image {idx}: {e}")

    return images


def remove_background_canva(image_path: pathlib.Path, output_path: pathlib.Path) -> None:
    """Remove background and upscale image using Canva API."""
    if not CANVA_API_KEY:
        print("Warning: CANVA_API_KEY not set, skipping background removal")
        shutil.copy(image_path, output_path)
        return

    try:
        # Step 1: Upload image to Canva
        with open(image_path, "rb") as f:
            upload_response = requests.post(
                "https://api.canva.com/rest/v1/assets",
                headers={
                    "Authorization": f"Bearer {CANVA_API_KEY}",
                    "Content-Type": "application/octet-stream"
                },
                data=f.read(),
                timeout=60
            )

        if upload_response.status_code != 200:
            print(f"Canva upload failed: {upload_response.text}")
            shutil.copy(image_path, output_path)
            return

        asset_id = upload_response.json()["asset"]["id"]

        # Step 2: Apply background removal and upscale
        edit_response = requests.post(
            "https://api.canva.com/rest/v1/asset-jobs",
            headers={
                "Authorization": f"Bearer {CANVA_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "asset_id": asset_id,
                "edit_operations": [
                    {"type": "background_removal"},
                    {"type": "upscale", "scale_factor": 2}
                ]
            },
            timeout=60
        )

        if edit_response.status_code != 200:
            print(f"Canva edit failed: {edit_response.text}")
            shutil.copy(image_path, output_path)
            return

        job_id = edit_response.json()["job"]["id"]

        # Step 3: Poll for completion
        max_attempts = 30
        for attempt in range(max_attempts):
            status_response = requests.get(
                f"https://api.canva.com/rest/v1/asset-jobs/{job_id}",
                headers={"Authorization": f"Bearer {CANVA_API_KEY}"},
                timeout=30
            )

            if status_response.status_code == 200:
                job_status = status_response.json()["job"]["status"]
                if job_status == "success":
                    result_url = status_response.json()["job"]["result"]["url"]
                    # Download processed image
                    img_data = requests.get(result_url, timeout=60).content
                    output_path.write_bytes(img_data)
                    print(f"✓ Canva processing complete (removed background + 2x upscale)")
                    return
                elif job_status == "failed":
                    print(f"Canva job failed")
                    break

            import time
            time.sleep(2)

        print("Canva processing timeout, using original image")
        shutil.copy(image_path, output_path)

    except Exception as e:
        print(f"Canva API error: {e}")
        shutil.copy(image_path, output_path)


def process_product_image(image_path: pathlib.Path, output_path: pathlib.Path) -> None:
    """
    Process product image:
    1. Remove background with Canva (includes 2x upscale)
    2. Add light grey background
    3. Resize to 1080x1080
    """
    # Remove background and upscale with Canva
    nobg_path = output_path.with_suffix(".nobg.png")
    remove_background_canva(image_path, nobg_path)

    # Add grey background and resize
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(nobg_path),
        "-vf", "scale=2160:-1:force_original_aspect_ratio=decrease,pad=2160:2160:(2160-iw)/2:(2160-ih)/2:color=0xF5F5F5,scale=1080:1080",
        "-qscale:v", "2",
        str(output_path)
    ], check=True, capture_output=True)

    nobg_path.unlink(missing_ok=True)


def scrape_amazon_price(url: str) -> Tuple[Optional[float], bool]:
    """Scrape Amazon price and Prime availability."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    html = requests.get(url, headers=headers, timeout=TIMEOUT).text
    soup = BeautifulSoup(html, "html.parser")

    price = None
    prime = bool(soup.find("i", {"class": "a-icon-prime"}))

    # Try multiple selectors
    selectors = [
        ("span", {"id": "priceblock_ourprice"}),
        ("span", {"id": "priceblock_dealprice"}),
        ("span", {"class": "a-price-whole"}),
        ("span", {"class": "a-offscreen"}),
    ]

    for tag, attrs in selectors:
        el = soup.find(tag, attrs)
        if el and re.search(r"\d", el.text):
            price_str = re.sub(r"[^\d\.]", "", el.text)
            try:
                price = float(price_str)
                break
            except ValueError:
                continue

    return (price, prime)


def scrape_aliexpress_price(url: str) -> Tuple[Optional[float], float]:
    """Scrape AliExpress item price and shipping cost."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    html = requests.get(url, headers=headers, timeout=TIMEOUT).text

    price = None
    shipping = 0.0

    # Try to find price in JSON data
    price_match = re.search(r'"price"\s*:\s*"(\d+(?:\.\d+)?)"', html)
    if price_match:
        price = float(price_match.group(1))

    # Check for free shipping
    if "Free Shipping" not in html and "Free shipping" not in html:
        shipping_match = re.search(r'\$(\d+(?:\.\d+)?)\s*shipping', html, re.IGNORECASE)
        if shipping_match:
            shipping = float(shipping_match.group(1))

    return (price, shipping)


def generate_marketing_copy(product_name: str, category: str, price: float) -> Dict:
    """Generate comprehensive marketing copy using OpenAI."""

    if not OPENAI_API_KEY:
        print("Warning: OPENAI_API_KEY not set, using templates")
        return generate_template_copy(product_name, category, price)

    prompt = f"""
Generate comprehensive marketing copy for this product:

Product: {product_name}
Category: {category}
Price: ${price:.2f}

Please provide:

1. **Shopify Product Description** (3 sections):
   - TITLE 1 + Short benefit-focused paragraph
   - TITLE 2 + Short feature paragraph
   - TITLE 3 + Short value proposition paragraph

2. **Meta Ads Copy**:
   - 6 Headlines (various hooks: discount, urgency, benefit, curiosity, social proof, transformation)
   - 3 Primary texts (short-form, engaging)
   - 3 Descriptions for ads

3. **Product Title Variants** (3 options for Shopify)

Format as JSON with keys: shopify_sections, meta_headlines, meta_primary_text, meta_descriptions, title_variants
"""

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4-turbo-preview",
                "messages": [
                    {"role": "system", "content": "You are an expert e-commerce copywriter. Generate compelling, benefit-driven product copy."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.8,
                "response_format": {"type": "json_object"}
            },
            timeout=60
        )

        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"]
            return json.loads(content)
        else:
            print(f"OpenAI API error: {response.text}")
            return generate_template_copy(product_name, category, price)

    except Exception as e:
        print(f"Error generating copy with OpenAI: {e}")
        return generate_template_copy(product_name, category, price)


def generate_template_copy(product_name: str, category: str, price: float) -> Dict:
    """Generate marketing copy from templates (fallback when OpenAI unavailable)."""
    return {
        "shopify_sections": [
            {
                "title": f"Elevate Your {category} Space",
                "paragraph": f"Introducing {product_name} – the perfect addition to transform your {category.lower()} area. Easy to install, built to last."
            },
            {
                "title": "Premium Quality, Affordable Price",
                "paragraph": f"Get professional results without the premium price tag. {product_name} delivers exceptional value at just ${price:.2f}."
            },
            {
                "title": "Fast & Free Shipping",
                "paragraph": "Order today and enjoy free shipping on your purchase. Installation takes just minutes with no special tools required."
            }
        ],
        "meta_headlines": [
            f"Save 35% on {product_name}",
            "Limited Time Offer - Act Fast",
            f"Transform Your {category} Today",
            "Free Shipping + Easy Returns",
            "Join 10,000+ Happy Customers",
            f"Upgrade Your {category} in Minutes"
        ],
        "meta_primary_text": [
            f"Today only! Get {product_name} and save big. Free shipping included.",
            f"Why wait? {product_name} makes your {category.lower()} project complete.",
            f"Thousands of satisfied customers can't be wrong. Try {product_name} risk-free."
        ],
        "meta_descriptions": [
            "Fast & free shipping on all orders",
            "Easy installation, no tools required",
            "30-day satisfaction guarantee"
        ],
        "title_variants": [
            f"{product_name} - Premium {category} Upgrade",
            f"{product_name} | {category} Essential",
            f"{product_name} - DIY {category} Solution"
        ]
    }


def upload_file(token: str, file_path: pathlib.Path, bucket_rel_path: str) -> str:
    """Upload file to Supabase Storage and return public URL."""
    with open(file_path, "rb") as f:
        response = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/product-assets/{bucket_rel_path}",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": ANON_KEY
            },
            files={"file": f},
            timeout=120
        )

    if response.status_code not in [200, 201]:
        raise RuntimeError(f"Upload failed: {response.text}")

    return f"{SUPABASE_URL}/storage/v1/object/public/product-assets/{bucket_rel_path}"


def import_product(token: str, product_payload: Dict) -> Dict:
    """Import product into database via Supabase function."""
    response = requests.post(
        f"{SUPABASE_URL}/functions/v1/import-products",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": ANON_KEY,
            "Content-Type": "application/json"
        },
        json={
            "source": "ai_agent_hybrid",
            "mode": "upsert",
            "products": [product_payload]
        },
        timeout=60
    )

    return response.json()


def main():
    """Main workflow execution."""
    # Parse command line arguments
    product_name = os.environ.get("PRODUCT_NAME", "")
    reel_url = os.environ.get("REEL_URL", "")
    amazon_url = os.environ.get("AMAZON_URL", "")
    aliexpress_url = os.environ.get("ALIEXPRESS_URL", "")
    amazon_price_str = os.environ.get("AMAZON_PRICE", "")
    aliexpress_price_str = os.environ.get("ALIEXPRESS_PRICE", "")
    suggested_retail_str = os.environ.get("SUGGESTED_RETAIL_PRICE", "")
    category = os.environ.get("CATEGORY", "Home & Garden")

    if not product_name or not reel_url:
        print("Error: PRODUCT_NAME and REEL_URL are required")
        sys.exit(1)

    print(f"Processing product: {product_name}")
    print(f"Reel URL: {reel_url}")

    # Authenticate
    token = login()

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = pathlib.Path(tmpdir)

        # Step 1: Download Instagram Reel
        print("Downloading Instagram Reel...")
        video_path = download_reel_mp4(reel_url, tmpdir / "video")
        print(f"✓ Downloaded: {video_path.name}")

        # Step 2: Generate GIFs
        print("Generating GIFs from clean segments...")
        gifs_dir = tmpdir / "gifs"
        gifs = make_gifs(video_path, gifs_dir, num_gifs=3)
        print(f"✓ Generated {len(gifs)} GIFs")

        # Step 3: Extract main image from video
        print("Extracting main product image...")
        main_img = tmpdir / "main.jpg"
        extract_main_image(video_path, main_img)
        print("✓ Extracted main image")

        # Step 4: Scrape and process product images
        images_to_process = [main_img]

        if amazon_url:
            print("Scraping Amazon images...")
            amazon_imgs = scrape_amazon_images(amazon_url, tmpdir / "amazon")
            images_to_process.extend(amazon_imgs[:3])
            print(f"✓ Scraped {len(amazon_imgs)} Amazon images")

        if aliexpress_url:
            print("Scraping AliExpress images...")
            ae_imgs = scrape_aliexpress_images(aliexpress_url, tmpdir / "aliexpress")
            images_to_process.extend(ae_imgs[:2])
            print(f"✓ Scraped {len(ae_imgs)} AliExpress images")

        # Process all images (remove background, add grey background, resize)
        print(f"Processing {len(images_to_process)} images...")
        processed_dir = tmpdir / "processed"
        processed_dir.mkdir(exist_ok=True)
        processed_images = []

        for idx, img_path in enumerate(images_to_process[:5], 1):
            output_path = processed_dir / f"product-{idx}.jpg"
            try:
                process_product_image(img_path, output_path)
                processed_images.append(output_path)
                print(f"✓ Processed image {idx}/{len(images_to_process)}")
            except Exception as e:
                print(f"Warning: Failed to process image {idx}: {e}")

        # Step 5: Scrape prices if not provided
        amazon_price = None
        aliexpress_price = None

        if amazon_price_str:
            amazon_price = float(amazon_price_str)
        elif amazon_url:
            print("Scraping Amazon price...")
            price, is_prime = scrape_amazon_price(amazon_url)
            if price and is_prime:
                amazon_price = price
                print(f"✓ Amazon Prime price: ${amazon_price:.2f}")

        if aliexpress_price_str:
            aliexpress_price = float(aliexpress_price_str)
        elif aliexpress_url:
            print("Scraping AliExpress price...")
            item_price, shipping = scrape_aliexpress_price(aliexpress_url)
            if item_price:
                aliexpress_price = item_price + shipping
                print(f"✓ AliExpress total: ${aliexpress_price:.2f}")

        # Calculate suggested retail price if not provided
        if suggested_retail_str:
            suggested_retail = float(suggested_retail_str)
        else:
            base_price = aliexpress_price or amazon_price or 20.0
            suggested_retail = round(base_price * 3, 2)

        print(f"Pricing: Amazon=${amazon_price}, AliExpress=${aliexpress_price}, Retail=${suggested_retail}")

        # Step 6: Generate marketing copy
        print("Generating marketing copy with AI...")
        copy = generate_marketing_copy(product_name, category, suggested_retail)
        print("✓ Generated marketing copy")

        # Step 7: Upload all assets to Supabase Storage
        print("Uploading assets to Supabase Storage...")
        slug = re.sub(r"[^a-z0-9]+", "-", product_name.lower()).strip("-")
        cat_slug = re.sub(r"[^a-z0-9]+", "-", category.lower()).strip("-")

        uploaded_images = []
        for idx, img_path in enumerate(processed_images):
            url = upload_file(token, img_path, f"{cat_slug}/{slug}/image-{idx+1}.jpg")
            uploaded_images.append({
                "url": url,
                "type": "main" if idx == 0 else "additional",
                "display_order": idx
            })
            print(f"✓ Uploaded image {idx+1}")

        uploaded_gifs = []
        for idx, gif_path in enumerate(gifs):
            url = upload_file(token, gif_path, f"{cat_slug}/{slug}/gif-{idx+1}.gif")
            uploaded_gifs.append({
                "type": "ad",
                "url": url,
                "platform": "meta",
                "headline": copy["meta_headlines"][idx % len(copy["meta_headlines"])],
                "ad_copy": copy["meta_primary_text"][idx % len(copy["meta_primary_text"])],
                "is_inspiration": False
            })
            print(f"✓ Uploaded GIF {idx+1}")

        # Add reel as inspiration
        creatives = [{
            "type": "reel",
            "url": reel_url,
            "platform": "instagram",
            "is_inspiration": True
        }] + uploaded_gifs

        # Step 8: Build product description from Shopify sections
        description_parts = []
        for section in copy["shopify_sections"]:
            description_parts.append(f"**{section['title']}**\n\n{section['paragraph']}")
        full_description = "\n\n".join(description_parts)

        # Step 9: Create product payload
        product_payload = {
            "external_id": f"ig:{video_path.stem}:{slug}",
            "name": product_name,
            "description": full_description,
            "category": category,
            "supplier_price": aliexpress_price,
            "recommended_retail_price": suggested_retail,
            "images": uploaded_images,
            "creatives": creatives,
            "metadata": {
                "amazon_url": amazon_url,
                "amazon_price": amazon_price,
                "aliexpress_url": aliexpress_url,
                "aliexpress_price": aliexpress_price,
                "generated_copy": copy,
                "ai_generated": True,
                "workflow": "hybrid_ai_agent"
            }
        }

        # Step 10: Import product
        print("Importing product to database...")
        result = import_product(token, product_payload)
        print("✓ Product imported successfully!")
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
