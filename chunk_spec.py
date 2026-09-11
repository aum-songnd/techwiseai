import json
import uuid
import re

input = "/home/toihoang/Code/techwiseai/data_laptop.json"
output = "/home/toihoang/Code/techwiseai/chunk_laptop.json"

with open(input, "r", encoding="utf-8") as f:
    products = json.load(f)


THONG_SO = {
    "cpu_gpu": [
        "Loại CPU",
        "Loại card đồ họa"
    ],

    "ram_ssd": [
        "Dung lượng RAM",
        "Loại RAM",
        "Số khe ram",
        "Ổ cứng"
    ],

    "man_hinh": [
        "Kích thước màn hình",
        "Độ phân giải màn hình",
        "Tần số quét",
        "Chất liệu tấm nền",
        "Công nghệ màn hình"
    ],

    "ket_noi": [
        "Wi-Fi",
        "Bluetooth",
        "Cổng giao tiếp",
        "Khe đọc thẻ nhớ"
    ],

    "thiet_ke": [
        "Chất liệu",
        "Chất liệu vỏ màn hình",
        "Chất liệu vỏ trên",
        "Chất liệu vỏ dưới",
        "Kích thước",
        "Trọng lượng"
    ],

    "pin": [
        "Pin"
    ],

    "tinh_nang_khac": [
        "Công nghệ âm thanh",
        "Tính năng đặc biệt",
        "Loại đèn bàn phím",
        "Bảo mật",
        "Webcam",
        "Hệ điều hành"
    ]
}

DAC_DIEM_NOI_BAT = {

    "cau_hinh": [
        "CPU",
        "GPU",
        "card đồ họa",
        "vi xử lý",
        "bộ vi xử lý",
        "chip",
        "Core i",
        "Ryzen",
        "Intel Core",
        "AMD Ryzen",
        "GeForce",
        "RTX",
        "GTX",
        "Radeon",
        "Apple M"
    ],

    "ram_ssd": [
        "RAM",
        "GB RAM",
        "bộ nhớ RAM",
        "DDR4",
        "DDR5",
        "SSD",
        "NVMe",
        "PCIe",
        "ổ cứng",
        "lưu trữ",
        "TB",
        "GB"
    ],

    "man_hinh": [
        "màn hình",
        "hiển thị",
        "tấm nền",
        "độ phân giải",
        "tần số quét",
        "Hz",
        "IPS",
        "OLED",
        "AMOLED",
        "Mini LED",
        "FHD",
        "2K",
        "2.5K",
        "3K",
        "4K",
        "Anti-Glare",
        "True Tone",
        "sRGB",
        "NTSC",
        "P3"
    ],

    "thiet_ke": [
        "trọng lượng",
        "kích thước",
        "vỏ máy",
        "vỏ nhựa",
        "vỏ kim loại",
        "chất liệu",
        "ngoại hình",
        "độ dày",
        "mỏng nhẹ",
        "bản lề"
    ],

    "ket_noi": [
        "cổng kết nối",
        "cổng USB",
        "USB-C",
        "Type-C",
        "HDMI",
        "Thunderbolt",
        "DisplayPort",
        "RJ45",
        "LAN",
        "Wi-Fi",
        "Bluetooth",
        "khe thẻ nhớ"
    ],

    "am_thanh": [
        "âm thanh",
        "loa",
        "audio",
        "Nahimic",
        "Hi-Res Audio",
        "Dolby Atmos",
        "micro"
    ],

    "pin": [
        "pin",
        "thời lượng pin",
        "Whr",
        "Wh",
        "cell",
        "sạc",
        "MagSafe"
    ],

    "tinh_nang_khac": [
        "tính năng đặc biệt",
        "bảo mật",
        "webcam",
        "camera",
        "hệ điều hành",
        "Windows",
        "macOS",
        "Linux",
        "bàn phím",
        "đèn nền",
        "RGB",
        "TPM",
        "Touch ID",
        "Face ID",
        "Apple Intelligence"
    ]
}
def chunk_thong_so(products):
    chunks = []
    for product in products:
        spec = product.get("specifications", {})

        for chunk_type, keys in THONG_SO.items():
            content = []
            for key in keys:
                value = spec.get(key)
                if value:
                    content.append(f"{key}: {value}")
            content = " ".join(content)

            if content:
                chunks.append({
                    "chunk_id": str(uuid.uuid4()),
                    "product_id": product["name"].lower().replace(" ", "_"),
                    "product_name": product["name"],
                    "chunk_type": chunk_type,
                    "source": "specification",
                    "content": content
                })

    return chunks

def highlight(text):
    text_lower = text.lower()

    matched_types = []

    for chunk_type, keywords in DAC_DIEM_NOI_BAT.items():
        for keyword in keywords:
            if keyword.lower() in text_lower:
                matched_types.append(chunk_type)
                break

    if not matched_types:
        matched_types.append("overview")

    return matched_types


def chunk_dac_diem_noi_bat(products):
    chunks = []

    for product in products:
        highlights = product.get("highlights", [])

        for text in highlights:

            # Bỏ highlight rỗng
            text = text.strip()

            if not text:
                continue

            chunk_type = highlight(text)

            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "product_id": product["name"].lower().replace(" ", "_"),
                "product_name": product["name"],
                "chunk_type": chunk_type,
                "source": "highlight",
                "content": text
            })

    return chunks

chunks = chunk_thong_so(products) + chunk_dac_diem_noi_bat(products)

with open(output, "w", encoding="utf-8") as f:
    json.dump(chunks, f, ensure_ascii=False, indent=4)
print(f"✓ Tổng số chunk: {len(chunks)}")

