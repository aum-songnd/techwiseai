import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument("--start-maximized")
driver = webdriver.Chrome(options=options)

CATEGORY_URL = "https://cellphones.com.vn/laptop.html"

driver.get(CATEGORY_URL)
time.sleep(3)

print("Đang tải danh sách toàn bộ laptop...")

previous_count = 0

while True:
    # 1. Cuộn từ từ xuống cuối trang để ép render sản phẩm (Lazy-load)
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight - 1000);")
    time.sleep(1.5)
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)

    # 2. Tìm nút "Xem thêm"
    try:
        btn_more = driver.find_elements(
            By.XPATH, 
            "//a[contains(@class, 'btn-show-more')] | //button[contains(normalize-space(), 'Xem thêm')] | //*[contains(text(), 'Xem thêm')]"
        )
        
        clicked = False
        for btn in btn_more:
            if btn.is_displayed():
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn)
                time.sleep(1)
                driver.execute_script("arguments[0].click();", btn)
                print("    ✓ Đã click 'Xem thêm'...")
                time.sleep(3)  # Chờ API/AJAX tải thêm danh sách
                clicked = True
                break

        # Nếu không thấy nút hiển thị hoặc đã tải hết
        if not clicked:
            # Kiểm tra xem số lượng phần tử có tăng thêm không
            current_elements = driver.find_elements(By.XPATH, "//a[contains(@href, '.html') and contains(@class, 'product')]")
            if len(current_elements) == previous_count:
                print("Đã tải toàn bộ danh sách sản phẩm.")
                break
            previous_count = len(current_elements)

    except Exception as e:
        print(f"Đã hoàn tất hoặc có lỗi nhỏ: {e}")
        break

# 3. Quét lấy tất cả đường link sản phẩm laptop
product_elements = driver.find_elements(
    By.XPATH, 
    "//a[contains(@href, '.html')]"
)

urls = set()

for el in product_elements:
    href = el.get_attribute("href")
    # Lọc chuẩn các URL chi tiết sản phẩm laptop
    if href and "cellphones.com.vn/laptop" in href and href.endswith(".html"):
        urls.add(href)

driver.quit()

print(f"\n✓ Tổng số URL độc nhất thu được: {len(urls)}")

# Lưu ra file urls.json
with open("urls.json", "w", encoding="utf-8") as f:
    json.dump(list(urls), f, ensure_ascii=False, indent=4)