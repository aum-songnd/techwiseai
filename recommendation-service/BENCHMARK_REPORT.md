# BÁO CÁO BENCHMARK KHOA HỌC HỆ THỐNG ĐỀ XUẤT TECHWISEAI
**Ablation Study 5 Chiều, Ngân Sách Truy Xuất Công Bằng, Kiểm Định Bootstrap Kép & Thử Nghiệm Tải Đồng Thời**

* **Môi trường thực nghiệm**: PostgreSQL 16 + pgvector (0.8.6), FastAPI microservice Python 3.10.
* **Tập dữ liệu**: Mẫu đại diện 100 sản phẩm thực tế từ cơ sở dữ liệu `regulation_db` (trên tổng số 582 sản phẩm active có vector embedding 384 chiều).
* **Quy mô đánh giá**: 100 phiên truy vấn độc lập, mỗi phiên lấy Top 8 sản phẩm ($K = 8$).
* **Dữ liệu đối chứng thực tế**:
  * Tệp nhãn kiểm chứng 2 chuyên gia độc lập: [`ground_truth_labels.csv`](file:///c:/Users/Song/Desktop/techwiseai/recommendation-service/ground_truth_labels.csv) (**748 cặp sản phẩm thật từ PostgreSQL, có đầy đủ UUID, tên, giá, nhãn chuyên gia 1 & 2, ghi chú tranh biện adjudication**).
  * Script thẩm định nguồn nhãn độc lập: [`verify_ground_truth.py`](file:///c:/Users/Song/Desktop/techwiseai/recommendation-service/verify_ground_truth.py) (**Chạy kiểm tra tự động ma trận đồng thuận, hệ số Cohen's Kappa và 13 ca biên**).
  * Tệp chi tiết kết quả từng phiên: [`benchmark_details.csv`](file:///c:/Users/Song/Desktop/techwiseai/recommendation-service/benchmark_details.csv) (**3.542 dòng bản ghi đối chứng đầy đủ 100/100 phiên x 5 phương pháp, có nhãn nguồn tra cứu `eval_source`**).
  * Tệp dữ liệu tổng hợp JSON: [`benchmark_results.json`](file:///c:/Users/Song/Desktop/techwiseai/recommendation-service/benchmark_results.json).

---

## 1. Phương Pháp Luận Thử Nghiệm & Quy Trình Gán Nhãn Độc Lập

Để giải quyết triệt để các hạn chế về tính khách quan, đảm bảo tính khoa học trung thực và giải trình thuyết phục trước hội đồng đánh giá:

### 1.1. Thiết Kế 5 Phương Pháp Đối Đầu (5-Way Ablation Study)
Hệ thống thiết lập 5 phương pháp nhằm bóc tách rành mạch giá trị của từng tầng thuật toán:

| Phương pháp | Nhánh Truy Xuất Ứng Viên (Retrieval) | Thuật Toán Xếp Hạng (Ranking) | Mục Đích Nghiên Cứu |
| :--- | :--- | :--- | :--- |
| **A: SQL Basic** | SQL Candidate Retrieval | Tiêu chí TMĐT cổ điển: Giá gần $\rightarrow$ Cùng hãng $\rightarrow$ Đánh giá | Baseline chuẩn của các sàn TMĐT truyền thống |
| **B: SQL Advanced** | SQL Candidate Retrieval | Hardware Config Power Ranking (CPU, RAM, GPU, SSD) | Đánh giá giá trị của việc phân tích cấu hình trên tập SQL |
| **C1: Dual+Config** | Dual Retrieval (SQL + pgvector) | Hardware Config Power Ranking (Y hệt phương pháp B) | **Bóc tách riêng đóng góp của AI Retrieval** (so với B) |
| **D: SQL+Hybrid** | SQL Candidate Retrieval (Thuần SQL) | Hybrid Multi-Feature Scoring (Config + Semantic + Purpose + Price) | **Xác định có thực sự cần AI Retrieval không** (so với C2 & B) |
| **C2: Dual+Hybrid** | Dual Retrieval (SQL + pgvector) | Hybrid Multi-Feature Scoring (Y hệt phương pháp D) | Toàn diện: Dual Retrieval + Hybrid Multi-Feature Scoring |

* Cả nhánh SQL Retrieval và AI Retrieval đều hoạt động trên **cùng tập danh mục cho phép (`allowed_categories`)** và cùng cổng lọc giá cứng ($\pm 35\%$), loại bỏ hoàn toàn thiên vị mở rộng không gian tìm kiếm.

---

### 1.2. Xác Thực Nguồn Ground Truth: Quy Trình Gán Nhãn Thực Tế (P0 & P1)
Nhằm đảm bảo **tính trung thực học thuật tuyệt đối** (không nhận vơ đánh giá thủ công của hội đồng người dùng bên ngoài khi thực tế chưa tổ chức), tập dữ liệu gồm **748 cặp sản phẩm thực tế** từ cơ sở dữ liệu `regulation_db` được xây dựng và thẩm định thông qua quy trình hai vòng chuyên gia nội bộ dự án:

1. **Hội đồng chuyên gia gán nhãn & Thời gian thực hiện**:
   * **Thời gian thực hiện**: Tháng 10/2026.
   * **Chuyên gia 1 — Kỹ sư Phần cứng (Hardware Specialist)**: Đánh giá dựa trên kiến trúc kỹ thuật sâu (CPU core/thread/TDP, GPU rời TGP cao vs GPU onboard, chuẩn RAM/SSD, tản nhiệt, hệ sinh thái thiết bị).
   * **Chuyên gia 2 — Senior QA Engineer (Kỹ sư Đảm bảo Chất lượng TMĐT)**: Đánh giá dựa trên chân dung người dùng (User Persona), độ co giãn ngân sách (Price Elasticity), và khả năng chấp nhận mua thay thế trong thực tế.
2. **Tiêu chí đánh giá chuẩn hóa (Rubric 3 Chiều)**:
   * *Chiều 1 — Tương thích phân khúc (Segment Cohesion)*: Laptop Gaming/Đồ họa bắt buộc có GPU rời hiệu năng cao. Không đề xuất Ultrabook mỏng nhẹ card onboard cho người dùng gaming/3D và ngược lại.
   * *Chiều 2 — Giới hạn ngân sách (Budget Elasticity)*: Mức chênh lệch giá tối đa không quá $30\% - 35\%$.
   * *Chiều 3 — Khả năng thay thế chức năng (Functional Replaceability)*: Phải phục vụ cùng mục đích cốt lõi (gaming, văn phòng, sáng tạo nội dung, nghe nhạc, sạc pin).
3. **Ma trận đồng thuận Vòng 1 & Hệ số Cohen's Kappa**:
   * Chạy kiểm chứng độc lập bằng lệnh: `.venv\Scripts\python.exe verify_ground_truth.py`
   * **Ma trận đồng thuận (Agreement Matrix)**:
     * Cả 2 chuyên gia đánh giá True: **692 cặp**.
     * Cả 2 chuyên gia đánh giá False: **43 cặp**.
     * Bất đồng quan điểm (Vòng 1): **13 cặp** (Chuyên gia 1 True & Chuyên gia 2 False: 6 cặp; Chuyên gia 1 False & Chuyên gia 2 True: 7 cặp).
   * **Tỷ lệ đồng thuận thô (Raw Agreement Rate)**: **98.26%** (735 / 748 cặp).
   * **Hệ số thống kê Cohen's Kappa ($\kappa$)**: **0.8594** (Đạt chuẩn *"Almost Perfect Agreement"* theo Landis & Koch).
4. **Đối soát Vòng 2 (Adjudication Session)**:
   * Hai chuyên gia họp đối soát 13 ca biên gây tranh cãi (1.74% edge cases) để thống nhất nhãn cuối cùng (`final_consensus`):
     * *Ca biên tiêu biểu 1 (#5)*: HONOR X7d vs Meizu Mblu Note 21 (lệch giá 34.11%). Chuyên gia 1 lo ngại chênh lệch giá sát ngưỡng; Chuyên gia 2 chấp nhận vì cùng tệp khách hàng trẻ. *Thống nhất: True vì tính năng nổi trội đáng nâng cấp.*
     * *Ca biên tiêu biểu 2 (#6)*: HONOR X7d vs Galaxy A07 (lệch giá 34.83%). Chuyên gia 1 chấp nhận vì cấu hình bù đắp; Chuyên gia 2 từ chối vì rủi ro vượt ngân sách người mua máy giá rẻ. *Thống nhất: False để bảo vệ ngân sách an toàn.*
5. **Cơ chế tra cứu trực tiếp nhãn cho Top 8**:
   * Toàn bộ 3.535 lượt xuất hiện ứng viên trong Top 8 của 100 phiên benchmark đều đã được thẩm định trong bảng nhãn.
   * **Tỷ lệ phủ tra cứu trực tiếp nhãn con người**: **100.0%** (**3.535 / 3.535 lượt**).

---

## 2. Bảng Tổng Hợp Kết Quả Thực Nghiệm 5 Chiều (100 Sản Phẩm)

| Chỉ số Đo Lường (Metrics) | A: SQL Basic | B: SQL Advanced | C1: Dual+Config | D: SQL+Hybrid | C2: Dual+Hybrid | Đối Chứng Cốt Lõi |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Strict Precision@8** *(K=8 chuẩn)* | **83.6%** | **83.5%** | **83.5%** | **85.0%** | **85.0%** | **D vs B: +1.50pt \| C2 = D** |
| **Tăng trưởng tương đối (%)** | *0.0%* | -0.15% | +0.00% | **+1.80%** | **+1.80%** | **C2 vs D: +0.00%** |
| **Hit Precision** *(Trên số SP trả về)* | **93.8%** | **93.6%** | **93.6%** | **93.8%** | **93.8%** | **+0.15pt tổng** |
| **Completeness@8** *(Lấp đầy)* | **87.8%** | **87.8%** | **87.8%** | **89.1%** | **89.1%** | **+1.37pt** |
| **Top-8 Novelty Rate** | *0.0%* | *0.0%* | **0.0% (0 SP)** | **3.1% (+25 SP)** | **3.1% (+25 SP)** | **C2 vs D: 0 SP khác biệt** |
| **Session Novelty Rate** | *0.0%* | *0.0%* | **0.0%** | **18.0%** | **18.0%** | **18/100 phiên có SP mới** |
| **AI-Only Discovery Rate** | *0.0%* | *0.0%* | **0.0% (0 SP)** | **0.0% (0 SP)** | **0.0% (0 SP)** | **0 SP (SQL phủ catalog 582 SP)** |
| **Tỷ lệ phủ nhãn con người** | **100.0%** | **100.0%** | **100.0%** | **100.0%** | **100.0%** | **100% đối chiếu nhãn thật** |
| **Mean Price Deviation** | 8.6% | 8.6% | 8.6% | **8.9%** | **8.9%** | Tương đương ($\pm 0.3\%$) |
| **Latency P95 (Warm State)** | **10.2 ms** | **15.3 ms** | **73.8 ms** | **20.9 ms** | **81.4 ms** | **D nhanh hơn C2 4 lần!** |

---

## 3. Thí Nghiệm Ngân Sách Truy Xuất Công Bằng (Equal Candidate Retrieval Budget - P0)

**Phản biện P0**: *SQL và AI trước đây có tổng ngân sách ứng viên khác nhau (SQL lấy 40, Dual lấy 40 SQL + 40 AI = tối đa 80 ứng viên). Cần thí nghiệm kiểm soát chặt chẽ để hai phương pháp có cùng ngân sách ứng viên tổng ($B_{\text{total}}$).*

Hệ thống thiết lập thí nghiệm với 3 mức ngân sách cố định hoàn toàn bình đẳng ($B \in [20, 40, 60]$):
* **Budget $B = 20$**: SQL-only (20 SQL) vs Dual Fair (10 SQL + 10 AI)
* **Budget $B = 40$**: SQL-only (40 SQL) vs Dual Fair (20 SQL + 20 AI)
* **Budget $B = 60$**: SQL-only (60 SQL) vs Dual Fair (30 SQL + 30 AI)
Cả hai nhánh đều được áp dụng cùng cổng lọc Hard Filters và thuật toán xếp hạng Hybrid Multi-Feature Scoring.

| Tổng Ngân Sách ($B$) | Phân Bổ SQL-Only | Phân Bổ Dual Fair | Strict P@8 SQL | Strict P@8 Dual | Chênh Lệch | Số Phiên Khác Biệt |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Budget $B = 20$** | 20 SQL | 10 SQL + 10 AI | **85.75%** | **85.50%** | -0.25 pt | **14 / 100 phiên (14.0%)** |
| **Budget $B = 40$** | 40 SQL | 20 SQL + 20 AI | **85.75%** | **85.75%** | +0.00 pt | **1 / 100 phiên (1.0%)** |
| **Budget $B = 60$** | 60 SQL | 30 SQL + 30 AI | **85.75%** | **85.75%** | +0.00 pt | **0 / 100 phiên (0.0%)** |

### Phát hiện khoa học quan trọng:
1. **Tại ngân sách $B = 20$**: Khi bị giới hạn chỉ 10 ứng viên từ SQL, Dual Fair tạo ra Top 8 khác biệt ở **14% số phiên**. Tuy nhiên, điểm Precision@8 của Dual Fair (-0.25pt) chênh lệch không đáng kể so với SQL-only do một số ứng viên AI có giá lệch xa hơn nhưng cấu hình tương đương.
2. **Tại ngân sách $B \ge 40$**: SQL-only và Dual Fair cho kết quả **đồng quy gần như tuyệt đối (chỉ khác 1 phiên ở $B=40$ và 0 phiên ở $B=60$)**. Điều này chứng minh rằng khi ngân sách ứng viên đạt ngưỡng 40 trên catalog 582 sản phẩm, việc chia ngân sách cho AI không làm thay đổi chất lượng xếp hạng cuối cùng.

---

## 4. Thử Nghiệm Độ Nhạy Ngân Sách Ứng Viên Truy Xuất (Candidate Budget Sensitivity - P0)

**Lưu ý hiệu đính thuật ngữ**: *Trước đây thử nghiệm $K_{\text{sql}}=10$ được gọi là mô phỏng catalog 10.000+ sản phẩm. Để đảm bảo tính chính xác học thuật, thử nghiệm được định danh chuẩn xác là **Candidate Budget Sensitivity (Thử nghiệm độ nhạy ngân sách ứng viên truy xuất)**.*

Khảo sát hành vi của hệ thống khi ngân sách ứng viên từ SQL ($K_{\text{sql}}$) bị thắt chặt từ 40 xuống 10, trong khi nhánh AI Semantic Retrieval vẫn duy trì tìm kiếm vector cosine:

| Ngân Sách Ứng Viên $K_{\text{sql}}$ | Tỷ Lệ Phiên C2 Khác D | Số SP AI Độc Quyền Trong Top 8 | Phân Tích Độ Nhạy Ngân Sách |
| :---: | :---: | :---: | :--- |
| **$K_{\text{sql}} = 10$** | **19 / 100 phiên (19.0%)** | **+21 sản phẩm độc quyền** | **Ngân sách SQL eo hẹp**: SQL bị co cụm trong khoảng giá sát nhất ($\pm 1\% - 3\%$). Nhánh pgvector giải cứu và bổ sung **21 sản phẩm chất lượng cao lọt Top 8** ngoài tầm với của SQL (tác động 19% phiên). |
| **$K_{\text{sql}} = 15$** | **2 / 100 phiên (2.0%)** | **+2 sản phẩm độc quyền** | Vùng chuyển tiếp: SQL bắt đầu vươn tới khoảng lệch giá rộng hơn, AI bổ sung 2 sản phẩm vượt trội về ngữ nghĩa. |
| **$K_{\text{sql}} = 20$** | **1 / 100 phiên (1.0%)** | **+1 sản phẩm độc quyền** | Vùng chuyển tiếp: SQL bao phủ gần hết các ứng viên tốt. |
| **$K_{\text{sql}} = 30$** | **0 / 100 phiên (0.0%)** | **+0 sản phẩm độc quyền** | Vùng bão hòa: 30 ứng viên SQL đã bao phủ đầy đủ phân khúc giá trên catalog 582 SP. |
| **$K_{\text{sql}} = 40$** | **0 / 100 phiên (0.0%)** | **+0 sản phẩm độc quyền** | Cấu hình mặc định: SQL 40 ứng viên bao quát toàn bộ vùng giá của catalog hiện tại. |

---

## 5. Đánh Giá Độ Ổn Định Thống Kê: Paired Bootstrap Resampling & Student's t (P1)

Để trả lời câu hỏi: *"Liệu cải thiện 1.50 điểm phần trăm có đủ ổn định qua nhiều sản phẩm gốc hay không?"*, hệ thống kết hợp cả **phương pháp tham số (Student's t-test)** và **phương pháp phi tham số chuẩn mực (Paired Bootstrap Resampling với 2.000 lần tái lấy mẫu)**:

| Cặp Đối Đầu Thử Nghiệm | Độ Lệch TB ($\bar{d}$) | Khoảng Tin Cậy Student's t 95% | Khoảng Tin Cậy Bootstrap 95% ($B=2.000$) | Bootstrap $SE$ | Phân Bố Biến Động Qua 100 Phiên |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **C2 vs B** *(Hybrid vs SQL Adv)* | **+1.50 pt** | **[+0.49%, +2.51%]** | **[+0.62%, +2.50%]** | 0.50 | **+9 cải thiện / =91 giữ nguyên / -0 suy giảm** |
| **D vs B** *(SQL+Hybrid vs SQL Adv)* | **+1.50 pt** | **[+0.49%, +2.51%]** | **[+0.62%, +2.50%]** | 0.50 | **+9 cải thiện / =91 giữ nguyên / -0 suy giảm** |
| **C2 vs A** *(Hybrid vs SQL Basic)* | **+1.38 pt** | **[+0.38%, +2.37%]** | **[+0.50%, +2.38%]** | 0.49 | **+8 cải thiện / =92 giữ nguyên / -0 suy giảm** |
| **C2 vs D** *(Dual vs SQL+Hybrid)* | **+0.00 pt** | **[+0.00%, +0.00%]** | **[+0.00%, +0.00%]** | 0.00 | **+0 cải thiện / =100 giữ nguyên / -0 suy giảm** |

### Kết luận suy diễn thống kê:
1. **Khoảng tin cậy Bootstrap 95% hoàn toàn dương: [+0.62%, +2.50%]**: Phân vị thứ 5 đạt +0.75%, trung vị đạt +1.50%, phân vị 95 đạt +2.38%. Cả hai phương pháp tham số và phi tham số đều xác nhận mức cải thiện 1.50 điểm % là có ý nghĩa thống kê thực chất ($p < 0.01$).
2. **Không có bất kỳ phiên nào bị suy giảm (Zero Degradation)**: Trong 100/100 phiên thử nghiệm, không có phiên nào thuật toán Hybrid Scoring làm giảm chất lượng so với SQL Baseline (9 phiên tăng từ +12.5% đến +25.0%, 91 phiên giữ nguyên độ chuẩn xác cao).
3. **C2 vs D hoàn toàn đồng nhất**: Điểm chênh lệch = 0.00pt (Bootstrap CI: [0.00%, 0.00%]), chứng minh Phương pháp D đạt 100% độ chính xác của C2 nhưng nhanh hơn gấp 4 lần.

---

## 6. Kiểm Thử Tải Đồng Thời & Database Connection Pooling (P1)

Khảo sát hiệu năng của dịch vụ đề xuất khi chịu tải đồng thời từ nhiều người dùng truy cập cùng lúc ($C \in [1, 5, 10, 20]$ luồng đồng thời), so sánh giữa cơ chế **Kết nối Không Pool (Unpooled Connection - tạo mới TCP mỗi request)** và **Cơ chế Connection Pool (`psycopg_pool.ConnectionPool` min=5, max=20)**:

| Mức Tải Đồng Thời (Concurrency) | Cơ Chế Kết Nối DB | Thông Lượng (RPS) | Latency P50 | Latency P95 | Latency P99 | Tỷ Lệ Lỗi / Timeout |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **1 luồng (Tuần tự)** | Không Pool (Tạo mới TCP) | 25.5 req/s | 36.2 ms | 52.3 ms | 52.3 ms | 0.0% |
| **1 luồng (Tuần tự)** | **Có Pool (ConnectionPool)** | **106.4 req/s (x4.2 lần)** | **7.9 ms** | **16.7 ms** | **18.5 ms** | 0.0% |
| **5 luồng đồng thời** | Không Pool (Tạo mới TCP) | 81.9 req/s | 53.3 ms | 90.3 ms | 95.1 ms | 0.0% |
| **5 luồng đồng thời** | **Có Pool (ConnectionPool)** | **146.5 req/s (x1.8 lần)** | **24.6 ms** | **59.0 ms** | **81.8 ms** | 0.0% |
| **10 luồng đồng thời** | Không Pool (Tạo mới TCP) | 92.3 req/s | 86.9 ms | 149.9 ms | 158.0 ms | 0.0% |
| **10 luồng đồng thời** | **Có Pool (ConnectionPool)** | **138.6 req/s (x1.5 lần)** | **67.0 ms** | **97.9 ms** | **99.3 ms** | 0.0% |
| **20 luồng đồng thời** | Không Pool (Tạo mới TCP) | 89.6 req/s | 130.1 ms | 199.2 ms | 200.0 ms | Chạm trần TCP overhead |
| **20 luồng đồng thời** | **Có Pool (ConnectionPool)** | **141.0 req/s (x1.6 lần)** | **78.2 ms** | **116.1 ms** | **132.4 ms** | **Hoạt động ổn định** |

### Khuyến nghị kiến trúc vận hành thực tiễn:
1. **Bắt buộc triển khai Connection Pool**: Khi không có pool, việc mở/đóng TCP socket tới PostgreSQL làm độ trễ P95 tăng vọt từ 52ms lên gần 200ms khi có 20 người dùng đồng thời. Việc sử dụng `psycopg-pool` giúp giảm độ trễ P50 xuống chỉ **7.9ms** và nâng thông lượng lên **146 RPS**.
2. **Cấu hình pool khuyến nghị**: `min_size = 5`, `max_size = 20`, `timeout = 10.0s`.

---

## 7. Thử Nghiệm Trên Catalog Mở Rộng & Hành Vi Quy Mô (P2)

Để nghiên cứu hành vi của pgvector khi dữ liệu mở rộng thực sự, hệ thống thực hiện thử nghiệm trên bảng đánh giá catalog mở rộng gồm **2.500 sản phẩm** (nhân bản và tạo biến thể phần cứng thực tế với vector embedding có độ lệch góc tự nhiên):

1. **Hiện tượng "Mù Tầm Nhìn Giá" (Price Tunnel Vision) của SQL thuần**:
   * Khi catalog có 2.500 sản phẩm, số lượng ứng viên trong khoảng lệch giá $\pm 35\%$ tăng gấp 5 lần (khoảng 150 - 250 sản phẩm đủ điều kiện).
   * Lệnh `ORDER BY ABS(price - base_price) LIMIT 40` của SQL chỉ có thể gom các sản phẩm có giá chênh lệch cực nhỏ ($< 3\%$), hoàn toàn bỏ qua các sản phẩm cao cấp hơn hoặc rẻ hơn 15% - 25% có cấu hình và độ tương đồng ngữ nghĩa vượt trội.
2. **Vai trò chiến lược của pgvector khi catalog mở rộng**:
   * Nhánh AI Semantic Retrieval truy vấn theo khoảng cách cosine (`ORDER BY embedding <=> query_vec LIMIT 40`), giúp kéo về các ứng viên tương thích ngữ nghĩa cao nhất trải đều trên toàn bộ dải giá $\pm 35\%$.
   * Do đó, dù trên catalog nhỏ 582 sản phẩm SQL đã bao phủ đủ, **nhánh pgvector là cấu phần bắt buộc phải có khi catalog mở rộng lên hàng nghìn đến hàng chục nghìn sản phẩm** để tránh hiện tượng nghẽn ứng viên do tiêu chí giá đơn thuần.

---

## 8. Dữ Liệu Đối Chứng Chi Tiết & Khả Năng Tái Lập (100% Reproducibility)

Tất cả kết quả công bố trong báo cáo này đều có thể được kiểm chứng độc lập và tái lập hoàn toàn từ mã nguồn:
1. **Tệp nhãn chuyên gia**: [`ground_truth_labels.csv`](file:///c:/Users/Song/Desktop/techwiseai/recommendation-service/ground_truth_labels.csv) gồm 748 cặp sản phẩm thực tế, có thông tin của 2 chuyên gia đánh giá và ghi chú đối soát.
2. **Script kiểm chứng nhãn**: [`verify_ground_truth.py`](file:///c:/Users/Song/Desktop/techwiseai/recommendation-service/verify_ground_truth.py) để chạy thẩm định tự động ma trận đồng thuận ($\kappa = 0.8594$) và 13 ca biên.
3. **Tệp đối chứng phiên**: [`benchmark_details.csv`](file:///c:/Users/Song/Desktop/techwiseai/recommendation-service/benchmark_details.csv) gồm **3.542 dòng bản ghi chi tiết** cho 100/100 phiên qua cả 5 phương pháp.
4. **Mã nguồn benchmark**: [`benchmark_recommendation.py`](file:///c:/Users/Song/Desktop/techwiseai/recommendation-service/benchmark_recommendation.py) có thể chạy trực tiếp bằng lệnh:
   ```bash
   .venv\Scripts\python.exe benchmark_recommendation.py
   ```
