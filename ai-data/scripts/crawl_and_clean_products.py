#!/usr/bin/env python3
"""
Crawler và Pipeline Làm Sạch Dữ Liệu Sản Phẩm cho TechWise AI Backend
Hỗ trợ các danh mục: Điện thoại, Tai nghe, Máy ảnh, Linh kiện, Phụ kiện.

Dữ liệu đầu ra tuân thủ 100% schema và các DB constraints của Spring Boot Backend:
- originalPrice >= price
- name <= 255 ký tự, slug <= 300 ký tự
- shortDescription <= 1000 ký tự
- SKU duy nhất theo prefix danh mục
- specifications dạng key-value map
- Đúng 1 ảnh primaryImage: true
"""

import argparse
import json
import logging
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from unicodedata import normalize

try:
    import requests
except ImportError:
    print("Vui lòng cài đặt requests: pip install requests")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("ProductCrawler")

# Thư mục lưu dữ liệu
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DATA_DIR = REPO_ROOT / "backend" / "src" / "main" / "resources" / "data"
AI_DATA_RAW_DIR = REPO_ROOT / "ai-data" / "raw"

# Cấu hình danh mục crawl
CATEGORIES_CONFIG = {
    "dien-thoai": {
        "name": "Điện thoại",
        "slug": "dien-thoai",
        "sku_prefix": "PHONE",
        "source_urls": [
            "https://cellphones.com.vn/mobile.html"
        ],
        "min_price": 500000,
        "default_warranty": "Bảo hành 12 tháng chính hãng"
    },
    "tai-nghe": {
        "name": "Tai nghe",
        "slug": "tai-nghe",
        "sku_prefix": "HEAD",
        "source_urls": [
            "https://cellphones.com.vn/thiet-bi-am-thanh/tai-nghe/tai-nghe-bluetooth.html",
            "https://cellphones.com.vn/thiet-bi-am-thanh/tai-nghe/tai-nghe-chup-tai.html",
            "https://cellphones.com.vn/thiet-bi-am-thanh/tai-nghe/tai-nghe-co-day.html"
        ],
        "min_price": 50000,
        "default_warranty": "Bảo hành 12 tháng chính hãng"
    },
    "may-anh": {
        "name": "Máy ảnh",
        "slug": "may-anh",
        "sku_prefix": "CAM",
        "source_urls": [
            "https://cellphones.com.vn/may-anh.html"
        ],
        "min_price": 500000,
        "default_warranty": "Bảo hành 24 tháng chính hãng"
    },
    "linh-kien": {
        "name": "Linh kiện",
        "slug": "linh-kien",
        "sku_prefix": "COMP",
        "source_urls": [
            "https://cellphones.com.vn/linh-kien.html"
        ],
        "min_price": 100000,
        "default_warranty": "Bảo hành 36 tháng chính hãng"
    },
    "phu-kien": {
        "name": "Phụ kiện",
        "slug": "phu-kien",
        "sku_prefix": "ACC",
        "source_urls": [
            "https://cellphones.com.vn/phu-kien/pin-du-phong.html",
            "https://cellphones.com.vn/phu-kien/sac-dien-thoai.html",
            "https://cellphones.com.vn/phu-kien/chuot-ban-phim.html",
            "https://cellphones.com.vn/phu-kien/bao-da-op-lung.html"
        ],
        "min_price": 30000,
        "default_warranty": "Bảo hành 12 tháng chính hãng"
    }
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "vi,en;q=0.9",
    "Connection": "keep-alive"
}


def slugify(text: str) -> str:
    """Tạo slug chuẩn SEO không dấu, cách nhau bởi dấu gạch ngang."""
    if not text:
        return ""
    text = normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r"[^\w\s-]", "", text).lower().strip()
    return re.sub(r"[-\s]+", "-", text)


def clean_text(text: str) -> str:
    """Xóa bỏ khoảng trắng thừa, giữ lại text gọn gàng."""
    if not text:
        return ""
    text = text.replace("\xa0", " ").strip()
    return re.sub(r"\s+", " ", text)


def extract_product_urls(source_urls: list, session: requests.Session) -> list:
    """Thu thập danh sách URL sản phẩm từ các trang danh mục."""
    product_urls = []
    seen = set()

    ignore_patterns = [
        "/page/", "/tin-tuc", "/danh-muc", "/brand", "/khuyen-mai",
        "cellphones.com.vn/mobile.html", "cellphones.com.vn/may-anh.html",
        "cellphones.com.vn/linh-kien.html", "cellphones.com.vn/phu-kien.html",
        "cellphones.com.vn/laptop.html", "cellphones.com.vn/dien-may.html"
    ]

    for cat_url in source_urls:
        try:
            logger.info(f"Đang quét danh sách sản phẩm từ: {cat_url}")
            resp = session.get(cat_url, headers=HEADERS, timeout=12)
            if resp.status_code != 200:
                logger.warning(f"Lỗi truy cập {cat_url}: HTTP {resp.status_code}")
                continue

            links = re.findall(r'href=[\"\'](https://cellphones\.com\.vn/[^\"\']+\.html)[\"\']', resp.text)
            for link in links:
                if any(p in link for p in ignore_patterns):
                    continue
                if link not in seen:
                    seen.add(link)
                    product_urls.append(link)

        except Exception as e:
            logger.error(f"Lỗi khi quét {cat_url}: {e}")

    logger.info(f"-> Thu được {len(product_urls)} liên kết sản phẩm độc nhất.")
    return product_urls


def crawl_product_detail(url: str, session: requests.Session) -> dict:
    """Crawl và bóc tách thông tin chi tiết một sản phẩm."""
    try:
        resp = session.get(url, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            return None

        # Trích xuất schema.org Product
        product_json = None
        for script_content in re.findall(r'<script[^>]*>(.*?)</script>', resp.text, re.DOTALL):
            if '"@type":"Product"' in script_content or '"@type": "Product"' in script_content:
                try:
                    data = json.loads(script_content.strip())
                    if data.get("@type") == "Product":
                        product_json = data
                        break
                except Exception:
                    continue

        if not product_json:
            return None

        name = clean_text(product_json.get("name", ""))
        if not name:
            return None

        # Giá bán & giá gốc
        offers = product_json.get("offers", {})
        price_val = offers.get("price")
        price = float(price_val) if price_val else 0.0

        # Thử tìm giá gốc trong HTML nếu có sale
        original_price = None
        prices_in_html = re.findall(r'(\d{1,3}(?:\.\d{3})+)\s*₫', resp.text)
        if prices_in_html:
            int_prices = [int(p.replace(".", "")) for p in prices_in_html if int(p.replace(".", "")) >= price]
            if int_prices:
                max_price = max(int_prices)
                if max_price > price:
                    original_price = float(max_price)

        # Thương hiệu
        brand_data = product_json.get("brand", {})
        brand = brand_data.get("name", "Khác") if isinstance(brand_data, dict) else str(brand_data)

        # Mô tả
        desc = product_json.get("description", "").strip()

        # Thông số kỹ thuật
        specs = {}
        for prop in product_json.get("additionalProperty", []):
            k = clean_text(prop.get("name", ""))
            v = clean_text(str(prop.get("value", "")))
            if k and v:
                specs[k] = v

        # Đánh giá trung bình & lượt review
        rating_data = product_json.get("aggregateRating", {})
        rating_avg = float(rating_data.get("ratingValue") or 5.0)
        review_count = int(rating_data.get("reviewCount") or 0)

        # Ảnh sản phẩm (chính + thư viện ảnh)
        main_img = product_json.get("image", "")
        gallery_images = re.findall(r'(https://cdn2\.cellphones\.com\.vn/x/media/catalog/product/[^\"\'\s>]+\.(?:png|jpg|webp))', resp.text)
        gallery_clean = list(dict.fromkeys(gallery_images))[:6]

        images = []
        all_imgs = [main_img] if main_img else []
        for g in gallery_clean:
            if g not in all_imgs:
                all_imgs.append(g)

        for idx, img_url in enumerate(all_imgs):
            images.append({
                "imageUrl": img_url,
                "altText": f"{name} - ảnh {idx + 1}",
                "displayOrder": idx,
                "primaryImage": (idx == 0),
                "publicId": None
            })

        return {
            "name": name,
            "url": url,
            "brand": brand,
            "price": price,
            "originalPrice": original_price,
            "description": desc,
            "specifications": specs,
            "ratingAverage": rating_avg,
            "reviewCount": review_count,
            "images": images,
            "thumbnailUrl": main_img or (images[0]["imageUrl"] if images else "")
        }

    except Exception as e:
        logger.debug(f"Lỗi khi crawl {url}: {e}")
        return None


def clean_and_format_product(raw_prod: dict, config: dict, sku_index: int) -> dict:
    """
    Làm sạch và chuẩn hóa sản phẩm theo đúng DB Constraints của Backend:
    1. originalPrice >= price hoặc None
    2. name <= 255 chars, slug <= 300 chars, shortDescription <= 1000 chars
    3. SKU duy nhất theo prefix
    4. Đúng 1 ảnh có primaryImage = True
    """
    name = raw_prod["name"][:255]
    slug = slugify(name)[:300]
    sku = f"{config['sku_prefix']}-{sku_index:04d}"

    price = raw_prod["price"]
    original_price = raw_prod.get("originalPrice")

    # DB CHECK Constraint: original_price IS NULL OR original_price >= price
    if original_price is not None and original_price < price:
        original_price = price

    desc = raw_prod.get("description") or f"Sản phẩm {name} chính hãng chất lượng cao."
    short_desc = (desc[:950] + "...") if len(desc) > 950 else desc

    rating_avg = max(0.0, min(5.0, raw_prod.get("ratingAverage", 5.0)))

    return {
        "categorySlug": config["slug"],
        "name": name,
        "slug": slug,
        "sku": sku,
        "brand": raw_prod.get("brand") or "Khác",
        "warranty": config.get("default_warranty"),
        "shortDescription": short_desc,
        "description": desc,
        "price": price,
        "originalPrice": original_price,
        "stockQuantity": 15,
        "thumbnailUrl": raw_prod.get("thumbnailUrl"),
        "active": True,
        "featured": False,
        "hot": False,
        "ratingAverage": round(rating_avg, 1),
        "soldCount": raw_prod.get("reviewCount", 0) * 2,
        "specifications": raw_prod.get("specifications", {}),
        "images": raw_prod.get("images", [])
    }


def process_category(cat_key: str, limit: int, delay: float):
    """Xử lý crawl và làm sạch cho một danh mục cụ thể."""
    config = CATEGORIES_CONFIG.get(cat_key)
    if not config:
        logger.error(f"Không tìm thấy cấu hình cho danh mục '{cat_key}'")
        return

    logger.info(f"\n=======================================================")
    logger.info(f"BẮT ĐẦU CRAWL DANH MỤC: {config['name']} (slug: {config['slug']})")
    logger.info(f"Giới hạn: tối đa {limit} sản phẩm")
    logger.info(f"=======================================================")

    session = requests.Session()
    raw_urls = extract_product_urls(config["source_urls"], session)

    if not raw_urls:
        logger.warning(f"Không tìm thấy URL nào cho danh mục {config['name']}")
        return

    cleaned_products = []
    rejected_count = 0
    seen_slugs = set()
    sku_counter = 1

    for idx, url in enumerate(raw_urls):
        if len(cleaned_products) >= limit:
            break

        logger.info(f"[{len(cleaned_products) + 1}/{limit}] Đang tải: {url.split('/')[-1]}")
        raw_detail = crawl_product_detail(url, session)

        if not raw_detail:
            rejected_count += 1
            time.sleep(delay)
            continue

        # Kiểm tra điều kiện làm sạch
        price = raw_detail.get("price", 0)
        if price < config.get("min_price", 0):
            logger.debug(f"Bỏ qua do giá bán {price} < min_price {config['min_price']}")
            rejected_count += 1
            time.sleep(delay)
            continue

        if not raw_detail.get("thumbnailUrl"):
            rejected_count += 1
            time.sleep(delay)
            continue

        slug = slugify(raw_detail["name"])
        if slug in seen_slugs:
            rejected_count += 1
            time.sleep(delay)
            continue
        seen_slugs.add(slug)

        # Làm sạch và format theo chuẩn Backend
        clean_item = clean_and_format_product(raw_detail, config, sku_counter)
        cleaned_products.append(clean_item)
        sku_counter += 1

        time.sleep(delay)

    # Đóng gói kết quả theo format LaptopImportFile của Backend
    output_data = {
        "metadata": {
            "source": "cellphones.com.vn",
            "category": {
                "name": config["name"],
                "slug": config["slug"]
            },
            "totalCrawled": len(cleaned_products),
            "rejected": rejected_count,
            "skuPrefix": config["sku_prefix"],
            "generatedAt": datetime.now().isoformat()
        },
        "products": cleaned_products
    }

    # Lưu file ra backend/src/main/resources/data/
    BACKEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_file = BACKEND_DATA_DIR / f"{config['slug']}_cleaned_for_import.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    logger.info(f"✓ ĐÃ LƯU THÀNH CÔNG: {out_file}")
    logger.info(f"✓ Tổng sản phẩm hợp lệ: {len(cleaned_products)} / Bỏ qua: {rejected_count}\n")


def main():
    parser = argparse.ArgumentParser(description="TechWise AI Product Crawler & Cleaner")
    parser.add_argument(
        "--category",
        choices=["all", "dien-thoai", "tai-nghe", "may-anh", "linh-kien", "phu-kien"],
        default="all",
        help="Danh mục cần crawl (mặc định: all)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=25,
        help="Số lượng sản phẩm tối đa cho mỗi danh mục (mặc định: 25)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.7,
        help="Thời gian nghỉ (giây) giữa các lượt request (mặc định: 0.7s)"
    )

    args = parser.parse_args()

    if args.category == "all":
        for cat_key in CATEGORIES_CONFIG.keys():
            process_category(cat_key, args.limit, args.delay)
    else:
        process_category(args.category, args.limit, args.delay)


if __name__ == "__main__":
    main()
