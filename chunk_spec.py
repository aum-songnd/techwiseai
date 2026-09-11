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
                "content": content
            })

with open(output, "w", encoding="utf-8") as f:
    json.dump(chunks, f, ensure_ascii=False, indent=4)

print(f"✓ Đã tạo {len(chunks)} chunk dữ liệu từ {len(products)} sản phẩm và lưu vào {output}")
