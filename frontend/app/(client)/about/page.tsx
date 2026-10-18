import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Headphones, Sparkles } from "lucide-react";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Về chúng tôi | TechWise AI",
  description:
    "Tìm hiểu về TechWise AI - nền tảng thương mại điện tử chuyên công nghệ AI, smartphone, laptop và phụ kiện chính hãng.",
};

const stats = [
  { label: "Sản phẩm chính hãng", value: "2,000+" },
  { label: "Khách hàng tin chọn", value: "50,000+" },
  { label: "Thương hiệu ủy quyền", value: "80+" },
  { label: "Năm kinh nghiệm", value: "5+ Năm" },
];

const values = [
  {
    icon: ShieldCheck,
    title: "100% Chính hãng",
    description:
      "Mọi sản phẩm tại TechWise AI đều được nhập khẩu trực tiếp từ nhà phân phối ủy quyền, đầy đủ hóa đơn VAT và tem bảo hành chính thức.",
  },
  {
    icon: Sparkles,
    title: "Giá niêm yết minh bạch",
    description:
      "Cam kết không phụ phí ẩn. Giá hiển thị là giá thanh toán cuối cùng của bạn, đã tích hợp đầy đủ mọi chương trình khuyến mãi và ưu đãi.",
  },
  {
    icon: Headphones,
    title: "Hậu mãi & Hỗ trợ tận tâm",
    description:
      "Đội ngũ kỹ thuật viên giàu kinh nghiệm sẵn sàng đồng hành cùng bạn 24/7 trong suốt quá trình sử dụng, ngay cả khi đơn hàng đã hoàn tất.",
  },
];

const AboutPage = () => {
  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Container className="py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Về chúng tôi</span>
        </nav>

        {/* Header Bar - Matching Cart & Blog style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Về Techwise AI
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ Câu chuyện & Sứ mệnh ]
            </span>
          </div>
          <p className="text-xs text-neutral-500 font-sans">
            Hệ sinh thái công nghệ AI & thiết bị thông minh hàng đầu.
          </p>
        </div>

        {/* Story Intro Card */}
        <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-4 mb-8">
          <span className="inline-block bg-shop_dark_green text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
            Sứ mệnh của chúng tôi
          </span>
          <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-neutral-900">
            Công nghệ thông minh giúp cuộc sống và công việc bứt phá
          </h2>
          <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-sans">
            Chúng tôi tin rằng công nghệ tiên tiến nhất nên được tiếp cận một cách minh bạch và dễ dàng. 
            TechWise AI ra đời nhằm mang đến giải pháp chọn lựa thiết bị chuẩn xác nhất cho từng nhu cầu thực tế: 
            từ smartphone, laptop xử lý AI đến tai nghe khử ồn cao cấp, giúp khách hàng đưa ra quyết định sáng suốt nhất.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="border border-neutral-200 bg-white p-6 text-center hover:border-shop_dark_green/40 transition-colors"
            >
              <p className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-shop_dark_green">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Values Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <div
                key={value.title}
                className="border border-neutral-200 bg-white p-6 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-shop_dark_green shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                    {value.title}
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner matching Cart Guarantees */}
        <div className="border border-neutral-200 p-6 bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Bạn cần tìm giải pháp thiết bị phù hợp?
            </h4>
            <p className="text-xs text-neutral-500">
              Khám phá ngay bộ sưu tập sản phẩm mới nhất hoặc nhận tư vấn kỹ thuật từ chuyên gia.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/shop"
              className="bg-shop_dark_green text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm"
            >
              Khám phá Shop &rarr;
            </Link>
            <Link
              href="/contact"
              className="border border-neutral-300 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Liên hệ chúng tôi
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default AboutPage;