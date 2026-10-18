import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Lock,
  ArrowRight,
  Headphones,
  FileQuestion,
} from "lucide-react";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Trung tâm trợ giúp | TechWise AI",
  description:
    "Trung tâm trợ giúp TechWise AI - Hướng dẫn chi tiết về đơn hàng, vận chuyển, đổi trả, bảo hành và tài khoản.",
};

const helpTopics = [
  {
    icon: PackageCheck,
    title: "Đơn hàng & Vận chuyển",
    description: "Tra cứu tiến độ giao hàng, thời gian nhận hàng dự kiến và quy trình đóng gói.",
    href: "/faqs",
    badge: "Phổ biến",
  },
  {
    icon: RotateCcw,
    title: "Đổi trả & Hoàn tiền",
    description: "Chính sách đổi trả miễn phí trong 7 ngày và thủ tục hoàn tiền nhanh chóng.",
    href: "/terms",
    badge: "7 Ngày",
  },
  {
    icon: ShieldCheck,
    title: "Bảo hành thiết bị",
    description: "Quy định bảo hành chính hãng, tra cứu số seri và địa chỉ trạm bảo hành ủy quyền.",
    href: "/faqs",
    badge: "Chính hãng",
  },
  {
    icon: Lock,
    title: "Tài khoản & Bảo mật",
    description: "Bảo vệ thông tin cá nhân, cập nhật số điện thoại, đổi mật khẩu và bảo mật 2 lớp.",
    href: "/privacy",
    badge: "An toàn",
  },
];

const HelpPage = () => {
  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Container className="py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Trung tâm trợ giúp</span>
        </nav>

        {/* Header Bar - Matching Cart & Blog style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Trung tâm trợ giúp
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ Hỗ trợ & Hướng dẫn ]
            </span>
          </div>
          <p className="text-xs text-neutral-500 font-sans">
            Giải đáp nhanh chóng các vấn đề về sản phẩm, giao vận và kỹ thuật.
          </p>
        </div>

        {/* Intro Callout Box */}
        <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-2 mb-8">
          <span className="inline-block bg-shop_dark_green text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
            Hướng dẫn người dùng
          </span>
          <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-neutral-900">
            Chúng tôi có thể giúp gì cho bạn hôm nay?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
            Chọn chủ đề bạn cần tìm hiểu bên dưới, hoặc gửi tin nhắn trực tiếp cho đội ngũ chuyên viên để được hỗ trợ tức thì.
          </p>
        </div>

        {/* Topics Grid */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {helpTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <Link
                key={topic.title}
                href={topic.href}
                className="group border border-neutral-200 bg-white p-6 transition-all duration-200 hover:border-shop_dark_green/40 hover:shadow-md flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 flex items-center justify-center bg-neutral-100 group-hover:bg-shop_dark_green group-hover:text-white transition-colors text-shop_dark_green">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 border border-neutral-200 px-2 py-0.5">
                      {topic.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold uppercase tracking-tight text-neutral-900 group-hover:text-shop_dark_green transition-colors">
                    {topic.title}
                  </h3>

                  <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                    {topic.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-shop_dark_green">
                  <span>Xem hướng dẫn</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Still Need Help Box */}
        <div className="border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Headphones className="h-4 w-4 text-shop_dark_green" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Vẫn cần thêm sự trợ giúp?
              </h3>
            </div>
            <p className="text-xs text-neutral-500 max-w-xl">
              Đội ngũ chăm sóc khách hàng của TechWise AI túc trực từ 8:00 đến 21:00 tất cả các ngày trong tuần (kể cả Thứ 7 & CN).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/faqs"
              className="inline-flex items-center gap-1.5 border border-neutral-300 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <FileQuestion size={13} />
              <span>Xem FAQs</span>
            </Link>
            <Link
              href="/contact"
              className="bg-shop_dark_green text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm"
            >
              Liên hệ hỗ trợ &rarr;
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default HelpPage;