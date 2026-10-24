import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ShieldCheck, ArrowRight } from "lucide-react";
import Container from "@/components/common/Container";

export const metadata: Metadata = {
  title: "Điều khoản & Điều kiện | TechWise AI",
  description: "Điều khoản và quy định sử dụng dịch vụ mua sắm trực tuyến tại TechWise AI.",
};

const sections = [
  {
    title: "1. Chấp thuận và Phạm vi Áp dụng",
    body: "Khi truy cập và đặt mua sản phẩm trên nền tảng thương mại điện tử TechWise AI, quý khách hàng mặc nhiên đồng ý tuân thủ toàn bộ các điều khoản và quy định này. Nếu không đồng ý với bất kỳ điều khoản nào, vui lòng tạm dừng việc sử dụng dịch vụ.",
  },
  {
    title: "2. Tài khoản & Bảo mật Thông tin",
    body: "Khách hàng có trách nhiệm tự bảo mật thông tin đăng nhập, mật khẩu và số điện thoại gắn với tài khoản cá nhân. Mọi giao dịch phát sinh từ tài khoản của bạn sẽ được xem là do bạn thực hiện. TechWise AI có quyền tạm khóa tài khoản để điều tra nếu phát hiện hành vi bất thường hoặc vi phạm chính sách.",
  },
  {
    title: "3. Xác nhận Đơn hàng & Giá niêm yết",
    body: "Đơn hàng chỉ được xác nhận chính thức khi hệ thống gửi thông báo xác nhận thành công và kiểm tra tình trạng tồn kho thực tế. Giá bán trên website là giá thanh toán cuối cùng đã bao gồm thuế VAT (trừ trường hợp lỗi hiển thị kỹ thuật rõ ràng, khi đó TechWise AI sẽ liên hệ hỗ trợ hoặc hoàn tiền theo quy định).",
  },
  {
    title: "4. Vận chuyển & Giao nhận Hàng hóa",
    body: "Thời gian giao hàng là thời gian ước tính dựa trên điều kiện vận hành tiêu chuẩn. TechWise AI hỗ trợ đồng kiểm ngoại quan sản phẩm trước khi nhận hàng. Trong trường hợp hàng hóa bị hư hại do vận chuyển, quý khách vui lòng từ chối nhận hàng và liên hệ ngay với bộ phận CSKH.",
  },
  {
    title: "5. Chính sách Đổi trả & Bảo hành Chính hãng",
    body: "Sản phẩm được áp dụng chính sách 1 đổi 1 trong vòng 7 ngày đầu nếu có lỗi kỹ thuật từ nhà sản xuất (yêu cầu còn nguyên tem, hộp và đầy đủ phụ kiện). Sau thời gian này, sản phẩm được bảo hành chính hãng theo chính sách bảo hành của từng thương hiệu phân phối.",
  },
  {
    title: "6. Giới hạn Trách nhiệm Pháp lý",
    body: "TechWise AI không chịu trách nhiệm đối với các thiệt hại phát sinh từ việc sử dụng thiết bị sai mục đích, can thiệp phần cứng trái phép, tự ý sửa đổi firmware không được hãng phê duyệt, hoặc các trường hợp bất khả kháng theo quy định pháp luật.",
  },
  {
    title: "7. Quyền Sửa đổi Điều khoản",
    body: "TechWise AI có quyền cập nhật, bổ sung các điều khoản này theo yêu cầu vận hành thực tế và quy định pháp luật hiện hành. Phiên bản mới nhất luôn được công khai trên website và có hiệu lực kể từ ngày đăng tải.",
  },
];

const TermsPage = () => {
  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Container className="py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Điều khoản & Điều kiện</span>
        </nav>

        {/* Header Bar - Matching Cart & Blog style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Điều khoản & Điều kiện
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ Cập nhật: 09/2026 ]
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
            <FileText className="h-4 w-4 text-shop_dark_green shrink-0" />
            <span>Quy chế hoạt động chính thức</span>
          </div>
        </div>

        {/* Main Document Body */}
        <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
          {/* Document Summary Lead */}
          <div className="border-l-2 border-shop_dark_green bg-neutral-50/70 p-4 text-xs sm:text-sm text-neutral-800 leading-relaxed font-sans italic">
            Quy chế và điều khoản dịch vụ này quy định quyền và nghĩa vụ giữa khách hàng và TechWise AI khi thực hiện các giao dịch mua sắm trực tuyến. Vui lòng đọc kỹ trước khi hoàn tất đặt hàng.
          </div>

          {/* Sections List */}
          <div className="space-y-6 divide-y divide-neutral-100">
            {sections.map((section, idx) => (
              <div key={section.title} className={idx > 0 ? "pt-6" : ""}>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-900 mb-2">
                  {section.title}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-sans">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 pt-6 mt-8">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="h-4 w-4 text-shop_dark_green" />
              <span>Chính sách được bảo vệ & tuân thủ pháp luật thương mại điện tử</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/privacy"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:text-shop_dark_green transition-colors"
              >
                <span>Chính sách bảo mật</span>
                <ArrowRight size={12} />
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:text-shop_dark_green transition-colors"
              >
                <span>Trung tâm trợ giúp</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default TermsPage;