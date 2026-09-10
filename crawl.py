
import json
import os
import re
import time
from datetime import datetime

from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


# ============================================================
# CONFIG
# ============================================================

PRODUCT_URL = ""

URL_FILE = "laptop_urls.json"
OUTPUT_FILE = "test_2_laptops.json"

# Số thông số tối thiểu bắt buộc
MIN_SPECS = 10

# Số laptop muốn crawl
MAX_PRODUCTS = 630

# Thời gian nghỉ giữa các laptop
DELAY_BETWEEN_PRODUCTS = 2

# Thời gian nghỉ giữa các lần retry
DELAY_BETWEEN_RETRY = 2


# ============================================================
# SELENIUM INITIALIZATION
# ============================================================

options = Options()

options.add_argument("--start-maximized")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--no-sandbox")
options.add_argument("--disable-gpu")

options.add_argument(
    "user-agent=Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

driver = webdriver.Chrome(options=options)

wait = WebDriverWait(driver, 15)


# ============================================================
# UTILS
# ============================================================

def clean_text(text):
    """
    Làm sạch text nhưng vẫn giữ xuống dòng.
    """

    if not text:
        return ""

    text = text.replace("\xa0", " ")
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    lines = []

    for line in text.split("\n"):

        line = re.sub(r"[ \t]+", " ", line).strip()

        if line:
            lines.append(line)

    return "\n".join(lines).strip()


def normalize_text(text):
    """
    Chuẩn hóa text để so sánh key.
    """

    if not text:
        return ""

    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# ============================================================
# PRODUCT NAME
# ============================================================

def crawl_name():

    try:

        h1 = driver.find_element(
            By.CSS_SELECTOR,
            "h1, .ksp-title"
        )

        return clean_text(h1.text)

    except Exception:

        return ""


# ============================================================
# PRICE
# ============================================================

def crawl_price():

    sale = None
    original = None

    try:

        body_text = clean_text(
            driver.find_element(
                By.TAG_NAME,
                "body"
            ).text
        )

        matches = re.findall(
            r"\b\d{1,3}(?:\.\d{3})+(?:đ|₫)?",
            body_text
        )

        numbers = []

        for item in matches:

            number = int(
                re.sub(
                    r"[^\d]",
                    "",
                    item
                )
            )

            if number >= 100000 and number not in numbers:
                numbers.append(number)

        if numbers:
            sale = numbers[0]

        if len(numbers) > 1:
            original = numbers[1]

    except Exception:
        pass

    return {
        "sale": sale,
        "original": original
    }


# ============================================================
# HIGHLIGHTS
# ============================================================

def crawl_highlights():

    print(
        "\n[HIGHLIGHTS] "
        "Đang crawl đặc điểm nổi bật..."
    )

    highlights = []

    try:

        html = driver.page_source

        soup = BeautifulSoup(
            html,
            "html.parser"
        )

        # ----------------------------------------------------
        # 1. SUMMARY
        # ----------------------------------------------------

        ksp_div = soup.select_one(
            "#cpsContent .ksp-content"
        )

        if ksp_div:

            summary = clean_text(
                ksp_div.get_text()
            )

            if summary:
                highlights.append(summary)

        # ----------------------------------------------------
        # 2. SEO CONTENT
        # ----------------------------------------------------

        seo_container = soup.select_one(
            "#cpsContentSEO"
        )

        if seo_container:

            for elem in seo_container.find_all(
                ["h2", "h3", "h4", "p", "li"]
            ):

                if elem.name == "p" and elem.find("img"):
                    continue

                text = clean_text(
                    elem.get_text()
                )

                if (
                    text
                    and len(text) > 5
                    and text not in highlights
                ):

                    if text.lower() in [
                        "xem thêm",
                        "thu gọn",
                        "nội dung chính",
                        "mua ngay"
                    ]:
                        continue

                    highlights.append(text)

        # ----------------------------------------------------
        # 3. FALLBACK
        # ----------------------------------------------------

        if len(highlights) < 2:

            cps_block = soup.select_one(
                "#cpsContent"
            )

            if cps_block:

                for p in cps_block.find_all(
                    ["p", "h2", "h3"]
                ):

                    text = clean_text(
                        p.get_text()
                    )

                    if (
                        text
                        and len(text) > 10
                        and text not in highlights
                    ):

                        highlights.append(text)

    except Exception as e:

        print(
            f"    ⚠ Lỗi highlights: {e}"
        )

    print(
        f"    ✓ Highlights: "
        f"{len(highlights)} đoạn"
    )

    return highlights


# ============================================================
# SPECIFICATIONS
# ============================================================

def crawl_specifications():

    print(
        "\n[SPECS] "
        "Đang lấy thông số kỹ thuật..."
    )

    specifications = {}

    # ========================================================
    # KNOWN KEYS
    # ========================================================

    KNOWN_KEYS = [

        "Loại card đồ họa",
        "Loại CPU",
        "Dung lượng RAM",
        "Loại RAM",
        "Số khe ram",
        "Ổ cứng",
        "Tần số quét",
        "Chất liệu tấm nền",
        "Kích thước màn hình",
        "Công nghệ màn hình",
        "Độ phân giải màn hình",
        "Công nghệ âm thanh",
        "Khe đọc thẻ nhớ",
        "Wi-Fi",
        "Bluetooth",
        "Cổng giao tiếp",
        "Chất liệu",
        "Chất liệu vỏ màn hình",
        "Chất liệu vỏ trên",
        "Chất liệu vỏ dưới",
        "Kích thước",
        "Trọng lượng",
        "Tính năng đặc biệt",
        "Loại đèn bàn phím",
        "Bảo mật",
        "Webcam",
        "Hệ điều hành",
        "Pin"

    ]

    # ========================================================
    # SECTION HEADERS
    # ========================================================

    SECTION_HEADERS = {

        "bộ xử lý & đồ họa",
        "bộ nhớ ram, ổ cứng",
        "màn hình",
        "âm thanh",
        "cổng kết nối",
        "kích thước & trọng lượng",
        "tiện ích khác",
        "tính năng khác",
        "pin & công nghệ sạc"

    }

    normalized_keys = {
        normalize_text(key).lower(): key
        for key in KNOWN_KEYS
    }

    # ========================================================
    # FIND BUTTON
    # ========================================================

    button_selectors = [

        ".button__show-modal-technical",

        '[class*="show-modal-technical"]',

        ".cps-block-technicalInfo button",

        ".cps-block-technicalInfo"

    ]

    button = None

    for selector in button_selectors:

        try:

            elements = driver.find_elements(
                By.CSS_SELECTOR,
                selector
            )

            if elements:

                # Lấy phần tử cuối
                button = elements[-1]

                if button.is_displayed():
                    break

        except Exception:
            continue

    # ========================================================
    # SCROLL TO BUTTON
    # ========================================================

    if button:

        try:

            driver.execute_script(
                """
                arguments[0].scrollIntoView({
                    behavior: 'instant',
                    block: 'center'
                });
                """,
                button
            )

            time.sleep(0.8)

        except Exception:
            pass

    # ========================================================
    # CLICK BUTTON
    # ========================================================

    clicked = False

    if button:

        try:

            # Click Selenium trước
            button.click()

            clicked = True

            print(
                "    ✓ Đã click "
                "Thông số kỹ thuật"
            )

        except Exception:

            try:

                # Nếu click thường lỗi,
                # dùng JavaScript
                driver.execute_script(
                    "arguments[0].click();",
                    button
                )

                clicked = True

                print(
                    "    ✓ Đã click "
                    "Thông số kỹ thuật "
                    "(JavaScript)"
                )

            except Exception as e:

                print(
                    f"    ✗ Không click được: {e}"
                )

    else:

        print(
            "    ✗ Không tìm thấy nút "
            "Thông số kỹ thuật"
        )

    if not clicked:
        return specifications

    # ========================================================
    # WAIT MODAL
    # ========================================================

    modal = None

    modal_selectors = [

        ".teleport-modal_main",

        ".teleport-modal",

        ".teleport-modal_content",

        ".modal-content",

        ".cps-modal-technical"

    ]

    try:

        WebDriverWait(
            driver,
            8
        ).until(

            lambda d: any(
                len(
                    d.find_elements(
                        By.CSS_SELECTOR,
                        selector
                    )
                ) > 0
                for selector in modal_selectors
            )

        )

    except Exception:

        print(
            "    ⚠ Timeout chờ modal"
        )

    # ========================================================
    # FIND MODAL
    # ========================================================

    for selector in modal_selectors:

        try:

            elements = driver.find_elements(
                By.CSS_SELECTOR,
                selector
            )

            if elements:

                # Modal được teleport xuống cuối body
                modal = elements[-1]

                print(
                    f"    ✓ Tìm thấy modal: "
                    f"{selector}"
                )

                break

        except Exception:
            continue

    if not modal:

        print(
            "    ✗ Không tìm thấy modal"
        )

        return specifications

    # ========================================================
    # WAIT TEXT
    # ========================================================

    try:

        WebDriverWait(
            driver,
            8
        ).until(
            lambda d: len(
                modal.text.strip()
            ) > 50
        )

    except Exception:

        pass

    # ========================================================
    # SCROLL MODAL
    # ========================================================

    try:

        driver.execute_script(
            """
            const modal = arguments[0];

            const elements = [
                modal,
                modal.querySelector(
                    '.teleport-modal_body'
                ),
                modal.querySelector(
                    '.teleport-modal_content'
                ),
                modal.querySelector(
                    '.teleport-modal_main'
                ),
                modal.querySelector(
                    '.modal-body'
                )
            ];

            for (const el of elements) {

                if (
                    el &&
                    el.scrollHeight > el.clientHeight
                ) {

                    el.scrollTop = 0;

                    el.scrollTop =
                        el.scrollHeight;

                }

            }
            """,
            modal
        )

        time.sleep(1)

    except Exception as e:

        print(
            f"    ⚠ Lỗi scroll modal: {e}"
        )

    # ========================================================
    # GET MODAL TEXT
    # ========================================================

    try:

        raw_text = modal.text

    except Exception as e:

        print(
            f"    ✗ Không lấy được text: {e}"
        )

        return specifications

    print(
        "\n---------- RAW SPECS ----------"
    )

    print(
        raw_text[:6000]
    )

    print(
        "--------------------------------"
    )

    # ========================================================
    # NORMALIZE
    # ========================================================

    raw_text = clean_text(
        raw_text
    )

    lines = [
        line.strip()
        for line in raw_text.split("\n")
        if line.strip()
    ]

    # ========================================================
    # STATE MACHINE
    # ========================================================

    current_key = None
    current_values = []

    def save_current():

        nonlocal current_key
        nonlocal current_values

        if current_key and current_values:

            value = " | ".join(
                x.strip()
                for x in current_values
                if x.strip()
            )

            if value:

                specifications[
                    current_key
                ] = value

        current_key = None
        current_values = []

    for line in lines:

        normalized_line = normalize_text(
            line
        )

        lower = normalized_line.lower()

        # ----------------------------------------------------
        # BỎ HEADER
        # ----------------------------------------------------

        if lower in SECTION_HEADERS:

            save_current()

            continue

        # ----------------------------------------------------
        # KEY + VALUE CÙNG DÒNG
        # Ví dụ:
        #
        # Loại CPU: Intel Core i5
        # ----------------------------------------------------

        if ":" in normalized_line:

            possible_key, possible_value = (
                normalized_line.split(
                    ":",
                    1
                )
            )

            possible_key = normalize_text(
                possible_key
            )

            possible_value = normalize_text(
                possible_value
            )

            key_lower = possible_key.lower()

            if key_lower in normalized_keys:

                save_current()

                current_key = normalized_keys[
                    key_lower
                ]

                if possible_value:

                    current_values.append(
                        possible_value
                    )

                continue

        # ----------------------------------------------------
        # KEY RIÊNG DÒNG
        # ----------------------------------------------------

        if lower in normalized_keys:

            save_current()

            current_key = normalized_keys[
                lower
            ]

            current_values = []

            continue

        # ----------------------------------------------------
        # VALUE
        # ----------------------------------------------------

        if current_key:

            if lower in [
                "xem thêm",
                "thu gọn",
                "đóng",
                "mua ngay"
            ]:
                continue

            current_values.append(
                normalized_line
            )

    # ========================================================
    # SAVE LAST
    # ========================================================

    save_current()

    # ========================================================
    # FALLBACK HTML
    # ========================================================

    if len(specifications) < MIN_SPECS:

        print(
            "\n    ⚠ Text parser chỉ lấy được "
            f"{len(specifications)} trường."
        )

        print(
            "    → Thử parser HTML..."
        )

        try:

            html = modal.get_attribute(
                "outerHTML"
            )

            soup = BeautifulSoup(
                html,
                "html.parser"
            )

            # ------------------------------------------------
            # Cách 1: table / tr
            # ------------------------------------------------

            for row in soup.find_all("tr"):

                cells = row.find_all(
                    ["td", "th"]
                )

                if len(cells) >= 2:

                    key = normalize_text(
                        cells[0].get_text(
                            " ",
                            strip=True
                        )
                    )

                    value = normalize_text(
                        cells[1].get_text(
                            " ",
                            strip=True
                        )
                    )

                    key_lower = key.lower()

                    if (
                        key_lower in normalized_keys
                        and value
                    ):

                        specifications[
                            normalized_keys[
                                key_lower
                            ]
                        ] = value

            # ------------------------------------------------
            # Cách 2: div/span
            # ------------------------------------------------

            elements = soup.find_all(
                [
                    "div",
                    "span",
                    "li"
                ]
            )

            texts = []

            for element in elements:

                text = normalize_text(
                    element.get_text(
                        " ",
                        strip=True
                    )
                )

                if text and text not in texts:

                    texts.append(text)

            # ------------------------------------------------
            # Tìm key → value kế tiếp
            # ------------------------------------------------

            for i, text in enumerate(texts):

                text_lower = text.lower()

                if text_lower in normalized_keys:

                    key = normalized_keys[
                        text_lower
                    ]

                    # Tìm value tiếp theo
                    for j in range(
                        i + 1,
                        min(i + 5, len(texts))
                    ):

                        candidate = normalize_text(
                            texts[j]
                        )

                        candidate_lower = (
                            candidate.lower()
                        )

                        if not candidate:
                            continue

                        if candidate_lower in SECTION_HEADERS:
                            break

                        if candidate_lower in normalized_keys:
                            break

                        if (
                            candidate_lower
                            != key.lower()
                        ):

                            specifications[
                                key
                            ] = candidate

                            break

        except Exception as e:

            print(
                f"    ⚠ HTML parser lỗi: {e}"
            )

    # ========================================================
    # CLEAN RESULT
    # ========================================================

    cleaned_specs = {}

    for key, value in specifications.items():

        key = normalize_text(key)
        value = normalize_text(value)

        if (
            key
            and value
            and key.lower()
            not in SECTION_HEADERS
        ):

            cleaned_specs[key] = value

    specifications = cleaned_specs

    # ========================================================
    # RESULT
    # ========================================================

    print(
        "\n    ✓ Tổng số thông số: "
        f"{len(specifications)}"
    )

    for key, value in specifications.items():

        print(
            f"       • {key}: {value}"
        )

    return specifications


# ============================================================
# CLOSE SPECIFICATION MODAL
# ============================================================

def close_specification_modal():

    try:

        selectors = [

            ".teleport-modal_main .close-btn",

            ".teleport-modal .close-btn",

            ".teleport-modal_main .close",

            ".teleport-modal .close"

        ]

        for selector in selectors:

            elements = driver.find_elements(
                By.CSS_SELECTOR,
                selector
            )

            if elements:

                try:

                    driver.execute_script(
                        "arguments[0].click();",
                        elements[-1]
                    )

                    time.sleep(0.5)

                    return

                except Exception:
                    pass

        # ----------------------------------------------------
        # Fallback ESC
        # ----------------------------------------------------

        from selenium.webdriver.common.keys import Keys

        driver.find_element(
            By.TAG_NAME,
            "body"
        ).send_keys(Keys.ESCAPE)

        time.sleep(0.5)

    except Exception:
        pass


# ============================================================
# IMAGES
# ============================================================

def crawl_images():

    images = []

    try:

        elements = driver.find_elements(
            By.TAG_NAME,
            "img"
        )

        for img in elements:

            src = (

                img.get_attribute("src")

                or img.get_attribute(
                    "data-src"
                )

                or img.get_attribute(
                    "data-original"
                )

            )

            if (

                src
                and src.startswith("http")
                and "cellphones.com.vn" in src
                and src not in images

            ):

                images.append(src)

    except Exception:
        pass

    return images


# ============================================================
# CRAWL ONE PRODUCT
# ============================================================

def crawl_product():

    print(
        "\n========================================"
    )

    print(
        "BẮT ĐẦU CRAWL SẢN PHẨM"
    )

    print(
        "========================================"
    )

    driver.get(PRODUCT_URL)

    # --------------------------------------------------------
    # WAIT H1
    # --------------------------------------------------------

    try:

        wait.until(
            EC.presence_of_element_located(
                (By.TAG_NAME, "h1")
            )
        )

    except Exception:

        print(
            "    ⚠ Không thấy H1 sau 15 giây"
        )

    # Chờ JS render
    time.sleep(2)

    # --------------------------------------------------------
    # NAME
    # --------------------------------------------------------

    name = crawl_name()

    print(
        f"\nTên sản phẩm: {name}"
    )

    # --------------------------------------------------------
    # PRICE
    # --------------------------------------------------------

    price = crawl_price()

    print(
        f"Giá sản phẩm: {price}"
    )

    # --------------------------------------------------------
    # HIGHLIGHTS
    # --------------------------------------------------------

    highlights = crawl_highlights()

    # --------------------------------------------------------
    # SPECS
    # --------------------------------------------------------

    specifications = crawl_specifications()

    # --------------------------------------------------------
    # IMAGES
    # --------------------------------------------------------

    images = crawl_images()

    product = {

        "name": name,

        "url": PRODUCT_URL,

        "price": price,

        "highlights": highlights,

        "specifications": specifications,

        "images": images,

        "crawled_at": datetime.now().isoformat()

    }

    return product


# ============================================================
# LOAD OLD DATA
# ============================================================

def load_existing_data():

    if not os.path.exists(
        OUTPUT_FILE
    ):
        return []

    try:

        with open(
            OUTPUT_FILE,
            "r",
            encoding="utf-8"
        ) as f:

            data = json.load(f)

            if isinstance(data, list):
                return data

    except Exception as e:

        print(
            f"⚠ Không đọc được file cũ: {e}"
        )

    return []


# ============================================================
# SAVE DATA
# ============================================================

def save_data(data):

    temp_file = OUTPUT_FILE + ".tmp"

    try:

        with open(
            temp_file,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                data,
                f,
                ensure_ascii=False,
                indent=4
            )

        # Ghi thành công mới thay file chính
        os.replace(
            temp_file,
            OUTPUT_FILE
        )

        return True

    except Exception as e:

        print(
            f"⚠ Lỗi lưu file: {e}"
        )

        return False


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    try:

        # ====================================================
        # LOAD URL
        # ====================================================

        try:

            with open(
                URL_FILE,
                "r",
                encoding="utf-8"
            ) as f:

                product_urls = json.load(f)

        except FileNotFoundError:

            print(
                f"Lỗi: Không tìm thấy "
                f"'{URL_FILE}'!"
            )

            product_urls = []

        if not isinstance(
            product_urls,
            list
        ):

            print(
                "Lỗi: laptop_urls.json "
                "phải chứa một list URL."
            )

            product_urls = []

        # ====================================================
        # LIMIT
        # ====================================================

        test_urls = product_urls[
            :MAX_PRODUCTS
        ]

        # ====================================================
        # LOAD OLD DATA
        # ====================================================

        all_laptops = load_existing_data()

        print(
            "\n========================================"
        )

        print(
            f"[START] Cần crawl "
            f"{len(test_urls)} laptop"
        )

        print(
            f"[REQUIREMENT] Mỗi laptop phải có "
            f">= {MIN_SPECS} thông số"
        )

        print(
            "========================================"
        )

        # ====================================================
        # LOOP PRODUCTS
        # ====================================================

        for index, url in enumerate(
            test_urls,
            start=1
        ):

            PRODUCT_URL = url

            print(
                "\n\n########################################"
            )

            print(
                f"PRODUCT {index}/{len(test_urls)}"
            )

            print(
                f"URL: {url}"
            )

            print(
                "########################################"
            )

            # =================================================
            # RETRY UNTIL ENOUGH SPECS
            # =================================================

            retry_count = 0

            while True:

                retry_count += 1

                print(
                    "\n----------------------------------------"
                )

                print(
                    f"[LẦN THỬ {retry_count}] "
                    f"Product {index}"
                )

                print(
                    "----------------------------------------"
                )

                try:

                    # -----------------------------------------
                    # CRAWL
                    # -----------------------------------------

                    product_data = crawl_product()

                    spec_count = len(
                        product_data.get(
                            "specifications",
                            {}
                        )
                    )

                    print(
                        "\n========================================"
                    )

                    print(
                        f"KẾT QUẢ LẦN {retry_count}"
                    )

                    print(
                        f"Số thông số: "
                        f"{spec_count}/{MIN_SPECS}"
                    )

                    print(
                        "========================================"
                    )

                    # -----------------------------------------
                    # ĐỦ SPECS
                    # -----------------------------------------

                    if spec_count >= MIN_SPECS:

                        print(
                            "\n✓✓✓ ĐỦ THÔNG SỐ ✓✓✓"
                        )

                        print(
                            f"✓ {spec_count} "
                            f"thông số >= {MIN_SPECS}"
                        )

                        # -------------------------------------
                        # APPEND
                        # -------------------------------------

                        all_laptops.append(
                            product_data
                        )

                        # -------------------------------------
                        # SAVE
                        # -------------------------------------

                        if save_data(
                            all_laptops
                        ):

                            print(
                                "\n✓ ĐÃ LƯU LAPTOP "
                                f"{index}"
                            )

                            print(
                                f"✓ File: "
                                f"{OUTPUT_FILE}"
                            )

                            print(
                                f"✓ Tổng số laptop "
                                f"trong file: "
                                f"{len(all_laptops)}"
                            )

                        else:

                            print(
                                "✗ Lưu file thất bại"
                            )

                        # -------------------------------------
                        # Đóng modal
                        # -------------------------------------

                        close_specification_modal()

                        # -------------------------------------
                        # Sang laptop tiếp theo
                        # -------------------------------------

                        break

                    # -----------------------------------------
                    # CHƯA ĐỦ
                    # -----------------------------------------

                    else:

                        print(
                            "\n⚠ CHƯA ĐỦ THÔNG SỐ"
                        )

                        print(
                            f"⚠ Hiện tại: "
                            f"{spec_count}"
                        )

                        print(
                            f"⚠ Cần ít nhất: "
                            f"{MIN_SPECS}"
                        )

                        print(
                            "→ KHÔNG LƯU"
                        )

                        print(
                            "→ SẼ CRAWL LẠI "
                            "CHÍNH LAPTOP NÀY"
                        )

                        # Không append
                        # Không save

                        close_specification_modal()

                except Exception as e:

                    print(
                        "\n✗ LỖI KHI CRAWL:"
                    )

                    print(
                        repr(e)
                    )

                    print(
                        "→ Không lưu"
                    )

                    print(
                        "→ Sẽ retry lại"
                    )

                # ---------------------------------------------
                # WAIT BEFORE RETRY
                # ---------------------------------------------

                print(
                    f"\nChờ "
                    f"{DELAY_BETWEEN_RETRY}s "
                    "trước khi retry..."
                )

                time.sleep(
                    DELAY_BETWEEN_RETRY
                )

                # ---------------------------------------------
                # QUAN TRỌNG:
                # crawl_product() ở lần tiếp theo sẽ
                # driver.get(URL) lại từ đầu.
                #
                # Như vậy không dùng lại modal/DOM cũ.
                # ---------------------------------------------

            # =================================================
            # DELAY BEFORE NEXT PRODUCT
            # =================================================

            if index < len(test_urls):

                print(
                    f"\n✓ Hoàn thành product {index}"
                )

                print(
                    f"Chờ "
                    f"{DELAY_BETWEEN_PRODUCTS}s "
                    "trước laptop tiếp theo..."
                )

                time.sleep(
                    DELAY_BETWEEN_PRODUCTS
                )

        # ====================================================
        # FINISHED
        # ====================================================

        print(
            "\n\n========================================"
        )

        print(
            "HOÀN TẤT CRAWL"
        )

        print(
            "========================================"
        )

        print(
            f"Số URL đã xử lý: "
            f"{len(test_urls)}"
        )

        print(
            f"Tổng laptop trong file: "
            f"{len(all_laptops)}"
        )

        print(
            f"File: {OUTPUT_FILE}"
        )

        print(
            "========================================"
        )

    finally:

        print(
            "\nĐóng Chrome..."
        )

        driver.quit()
