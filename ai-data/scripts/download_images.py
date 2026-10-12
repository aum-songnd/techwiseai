import argparse
import hashlib
import io
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image
from requests.adapters import HTTPAdapter
from tqdm import tqdm
from urllib3.util.retry import Retry


AI_DATA_DIR = Path(__file__).resolve().parents[1]
CATALOG_PATH = AI_DATA_DIR / "raw" / "laptops_catalog.json"
IMAGES_DIR = AI_DATA_DIR / "images"
MANIFESTS_DIR = AI_DATA_DIR / "manifests"

MANIFEST_PATH = MANIFESTS_DIR / "images.jsonl"
FAILED_PATH = MANIFESTS_DIR / "failed_images.jsonl"

MAX_IMAGE_SIZE = 20 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

EXTENSIONS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}


def current_time():
    return datetime.now(timezone.utc).isoformat()


def safe_directory_name(value):
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value)


def calculate_sha256(data):
    return hashlib.sha256(data).hexdigest()


def calculate_file_sha256(path):
    digest = hashlib.sha256()

    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def inspect_image_bytes(data):
    with Image.open(io.BytesIO(data)) as image:
        image_format = (image.format or "").upper()
        width, height = image.size

        # Đọc toàn bộ để phát hiện file ảnh bị hỏng.
        image.load()

    if image_format not in ALLOWED_FORMATS:
        raise ValueError(f"Định dạng ảnh không hỗ trợ: {image_format}")

    return image_format, width, height


def inspect_image_file(path):
    with Image.open(path) as image:
        image_format = (image.format or "").upper()
        width, height = image.size
        image.load()

    if image_format not in ALLOWED_FORMATS:
        raise ValueError(f"Định dạng ảnh không hỗ trợ: {image_format}")

    return image_format, width, height


def create_http_session():
    retry_policy = Retry(
        total=3,
        connect=3,
        read=3,
        status=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=frozenset(["GET"]),
        respect_retry_after_header=True,
    )

    adapter = HTTPAdapter(
        max_retries=retry_policy,
        pool_connections=10,
        pool_maxsize=10,
    )

    session = requests.Session()
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 TechWiseAI-Dataset-Downloader/1.0"
        ),
        "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*",
    })

    return session


def download_image(session, url):
    chunks = []
    downloaded_size = 0

    with session.get(
        url,
        stream=True,
        timeout=(10, 60),
        allow_redirects=True,
    ) as response:
        response.raise_for_status()

        content_length = response.headers.get("Content-Length")

        if content_length and int(content_length) > MAX_IMAGE_SIZE:
            raise ValueError("Ảnh vượt quá giới hạn 20 MB")

        for chunk in response.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue

            downloaded_size += len(chunk)

            if downloaded_size > MAX_IMAGE_SIZE:
                raise ValueError("Ảnh vượt quá giới hạn 20 MB")

            chunks.append(chunk)

        content_type = response.headers.get("Content-Type")

    if downloaded_size == 0:
        raise ValueError("File ảnh rỗng")

    return b"".join(chunks), content_type


def load_jsonl(path):
    records = {}

    if not path.exists():
        return records

    with path.open("r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()

            if not line:
                continue

            try:
                record = json.loads(line)
                image_id = record.get("imageId")

                if image_id:
                    records[image_id] = record
            except json.JSONDecodeError:
                continue

    return records


def save_jsonl(path, records):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")

    with temporary_path.open("w", encoding="utf-8") as file:
        for record in records:
            file.write(
                json.dumps(record, ensure_ascii=False) + "\n"
            )

    temporary_path.replace(path)


def find_existing_image(product_directory, image_id, manifest_record):
    if manifest_record:
        local_path = manifest_record.get("localPath")

        if local_path:
            candidate = AI_DATA_DIR / local_path

            if candidate.exists():
                return candidate

    for candidate in product_directory.glob(f"{image_id}.*"):
        if candidate.is_file() and not candidate.name.endswith(".tmp"):
            return candidate

    return None


def build_manifest_record(
    product,
    image,
    local_path,
    image_format,
    width,
    height,
    file_size,
    sha256,
    content_type=None,
):
    return {
        "productId": product["productId"],
        "imageId": image["id"],
        "sku": product["sku"],
        "productName": product["name"],
        "brand": product.get("brand"),
        "localPath": local_path.relative_to(AI_DATA_DIR).as_posix(),
        "sourceUrl": image["imageUrl"],
        "sha256": sha256,
        "format": image_format,
        "width": width,
        "height": height,
        "fileSize": file_size,
        "contentType": content_type,
        "displayOrder": image.get("displayOrder"),
        "primaryImage": image.get("primaryImage", False),
        "downloadedAt": current_time(),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Tải ảnh sản phẩm cho dataset TechWiseAI"
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Giới hạn số ảnh để chạy thử",
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=0.1,
        help="Thời gian nghỉ giữa các request",
    )

    args = parser.parse_args()

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)

    if not CATALOG_PATH.exists():
        raise FileNotFoundError(
            f"Không tìm thấy catalog: {CATALOG_PATH}"
        )

    with CATALOG_PATH.open("r", encoding="utf-8") as file:
        products = json.load(file)

    download_jobs = []

    for product in products:
        for image in product.get("images", []):
            download_jobs.append((product, image))

    if args.limit is not None:
        download_jobs = download_jobs[:args.limit]

    successful_records = load_jsonl(MANIFEST_PATH)
    failed_records = []

    downloaded = 0
    skipped = 0
    failed = 0

    session = create_http_session()

    try:
        for index, (product, image) in enumerate(
            tqdm(download_jobs, desc="Đang xử lý ảnh"),
            start=1,
        ):
            image_id = image.get("id")
            image_url = image.get("imageUrl")
            sku = product.get("sku", "UNKNOWN")

            product_directory = (
                IMAGES_DIR / safe_directory_name(sku)
            )
            product_directory.mkdir(parents=True, exist_ok=True)

            try:
                if not image_id:
                    raise ValueError("Ảnh không có imageId")

                if not image_url:
                    raise ValueError("Ảnh không có URL")

                old_record = successful_records.get(image_id)

                existing_path = find_existing_image(
                    product_directory,
                    image_id,
                    old_record,
                )

                if existing_path:
                    image_format, width, height = inspect_image_file(
                        existing_path
                    )

                    record = build_manifest_record(
                        product=product,
                        image=image,
                        local_path=existing_path,
                        image_format=image_format,
                        width=width,
                        height=height,
                        file_size=existing_path.stat().st_size,
                        sha256=calculate_file_sha256(existing_path),
                        content_type=(
                            old_record.get("contentType")
                            if old_record
                            else None
                        ),
                    )

                    successful_records[image_id] = record
                    skipped += 1
                    continue

                image_data, content_type = download_image(
                    session,
                    image_url,
                )

                image_format, width, height = inspect_image_bytes(
                    image_data
                )

                extension = EXTENSIONS[image_format]
                final_path = product_directory / (
                    f"{image_id}{extension}"
                )
                temporary_path = final_path.with_suffix(
                    final_path.suffix + ".tmp"
                )

                temporary_path.write_bytes(image_data)
                temporary_path.replace(final_path)

                record = build_manifest_record(
                    product=product,
                    image=image,
                    local_path=final_path,
                    image_format=image_format,
                    width=width,
                    height=height,
                    file_size=len(image_data),
                    sha256=calculate_sha256(image_data),
                    content_type=content_type,
                )

                successful_records[image_id] = record
                downloaded += 1

                # Lưu định kỳ để không mất tiến độ nếu bị gián đoạn.
                if index % 25 == 0:
                    save_jsonl(
                        MANIFEST_PATH,
                        sorted(
                            successful_records.values(),
                            key=lambda item: (
                                item["sku"],
                                item.get("displayOrder") or 0,
                                item["imageId"],
                            ),
                        ),
                    )

            except Exception as exception:
                failed += 1

                failed_records.append({
                    "productId": product.get("productId"),
                    "imageId": image_id,
                    "sku": sku,
                    "sourceUrl": image_url,
                    "error": str(exception),
                    "failedAt": current_time(),
                })

            finally:
                if args.delay > 0:
                    time.sleep(args.delay)

    finally:
        session.close()

        sorted_records = sorted(
            successful_records.values(),
            key=lambda item: (
                item["sku"],
                item.get("displayOrder") or 0,
                item["imageId"],
            ),
        )

        save_jsonl(MANIFEST_PATH, sorted_records)
        save_jsonl(FAILED_PATH, failed_records)

    print()
    print("Hoàn thành lượt tải ảnh")
    print(f"- Số ảnh trong lượt chạy: {len(download_jobs)}")
    print(f"- Tải mới thành công: {downloaded}")
    print(f"- Đã có nên bỏ qua: {skipped}")
    print(f"- Tải thất bại: {failed}")
    print(f"- Tổng ảnh trong manifest: {len(successful_records)}")


if __name__ == "__main__":
    main()