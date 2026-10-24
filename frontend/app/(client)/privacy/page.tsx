import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ShieldCheck, ArrowRight } from "lucide-react";
import Container from "@/components/common/Container";

export const metadata: Metadata = {
  title: "Chính sách bảo mật | TechWise AI",
  description: "Chính sách bảo mật thông tin và quyền riêng tư của khách hàng tại TechWise AI.",
};

const sections = [
  {
    title: "1. Thông tin chúng tôi thu thập",
    body: "Chúng tôi chỉ thu thập các thông tin cần thiết phục vụ quá trình đặt hàng và giao hàng, bao gồm: Họ và tên, số điện thoại, địa chỉ email, địa chỉ giao nhận hàng. Ngoài ra, dữ liệu duyệt web cơ bản (loại trình duyệt, địa chỉ IP ẩn danh) được lưu trữ tạm thời để tối ưu trải nghiệm và ngăn ngừa gian lận.",
  },
  {
    title: "2. Mục đích sử dụng thông tin",
    body: "Thông tin cá nhân của quý khách được sử dụng độc quyền để: Xác thực và xử lý đơn đặt hàng, liên hệ cập nhật hành trình vận chuyển, xử lý bảo hành điện tử, và hỗ trợ giải quyết thắc mắc khi khách hàng yêu cầu qua các kênh CSKH.",
  },
  {
    title: "3. Cam kết không chia sẻ cho bên thứ ba",
    body: "TechWise AI cam kết tuyệt đối không bán, cho thuê hay thương mại hóa dữ liệu cá nhân của người dùng. Thông tin của bạn chỉ được chuyển giao giới hạn cho đối tác vận chuyển ủy quyền (để giao hàng) và cổng thanh toán được cấp phép (để xử lý giao dịch an toàn).",
  },
  {
    title: "4. Tiêu chuẩn bảo mật dữ liệu",
    body: "Mọi dữ liệu truyền tải giữa thiết bị của bạn và hệ thống máy chủ TechWise AI đều được mã hóa bằng giao thức bảo mật SSL/TLS tiêu chuẩn cao nhất. Mật khẩu tài khoản được mã hóa một chiều (hashing) an toàn tuyệt đối.",
  },
  {
    title: "5. Cơ chế lưu trữ Cookie",
    body: "TechWise AI sử dụng Cookie để ghi nhớ trạng thái giỏ hàng, thông tin đăng nhập và tùy chọn giao diện của bạn. Bạn hoàn toàn có quyền cấu hình tắt Cookie trên trình duyệt, tuy nhiên một số tính năng cá nhân hóa có thể bị gián đoạn.",
  },
  {
    title: "6. Quyền kiểm soát dữ liệu của bạn",
    body: "Bạn có toàn quyền kiểm tra, cập nhật hoặc yêu cầu xóa bỏ thông tin cá nhân của mình khỏi hệ thống bất kỳ lúc nào thông qua trang Quản lý tài khoản hoặc gửi yêu cầu tới Trung tâm hỗ trợ của chúng tôi.",
  },
  {
    title: "7. Cập nhật và Thay đổi Chính sách",
    body: "Chính sách này có thể được điều chỉnh định kỳ để phù hợp với các quy định pháp luật hiện hành về an toàn thông tin mạng. Mọi thay đổi đều được công bố minh bạch và ghi nhận mốc thời gian cập nhật trên trang này.",
  },
];

const PrivacyPage = () => {
  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Container className="py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Chính sách bảo mật</span>
        </nav>

        {/* Header Bar - Matching Cart & Blog style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Chính sách bảo mật
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ Cập nhật: 09/2026 ]
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
            <Lock className="h-4 w-4 text-shop_dark_green shrink-0" />
            <span>Cam kết an toàn thông tin cá nhân</span>
          </div>
        </div>

        {/* Main Document Body */}
        <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
          {/* Document Summary Lead */}
          <div className="border-l-2 border-shop_dark_green bg-neutral-50/70 p-4 text-xs sm:text-sm text-neutral-800 leading-relaxed font-sans italic">
            TechWise AI tôn trọng quyền riêng tư của khách hàng. Chính sách này mô tả chi tiết cách thức chúng tôi thu thập, lưu trữ và bảo vệ dữ liệu cá nhân của bạn khi sử dụng nền tảng mua sắm của chúng tôi.
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
              <span>Dữ liệu được bảo vệ nghiêm ngặt theo tiêu chuẩn an ninh mạng</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/terms"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:text-shop_dark_green transition-colors"
              >
                <span>Điều khoản & Điều kiện</span>
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

export default PrivacyPage;