"use client";

import React from "react";
import Link from "next/link";
import {
  Gamepad2,
  Briefcase,
  GraduationCap,
  Code2,
  Palette,
  Headphones,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface DemandCard {
  id: string;
  title: string;
  tagline: string;
  specsHighlight: string;
  icon: React.ReactNode;
  bgGradient: string;
  badge: string;
  badgeColor: string;
  href: string;
  category: string;
}

const DEMANDS: DemandCard[] = [
  {
    id: "gaming",
    title: "Gaming & eSports",
    tagline: "Chiến game AAA mượt mà",
    specsHighlight: "RTX 40 Series • 144Hz - 240Hz • Tản nhiệt buồng hơi",
    icon: <Gamepad2 className="w-6 h-6 text-red-500" />,
    bgGradient: "from-red-950/20 via-neutral-900/5 to-white hover:border-red-500/40",
    badge: "Hiệu năng cực đỉnh",
    badgeColor: "bg-red-500/10 text-red-600 border-red-200",
    href: "/shop?demand=gaming",
    category: "laptop",
  },
  {
    id: "office",
    title: "Văn phòng & Doanh nhân",
    tagline: "Sang trọng, mỏng nhẹ, pin trâu",
    specsHighlight: "Trọng lượng < 1.3kg • Pin 15h+ • Bảo mật vân tay",
    icon: <Briefcase className="w-6 h-6 text-blue-500" />,
    bgGradient: "from-blue-950/20 via-neutral-900/5 to-white hover:border-blue-500/40",
    badge: "Mỏng nhẹ bền bỉ",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-200",
    href: "/shop?demand=office",
    category: "laptop",
  },
  {
    id: "student",
    title: "Sinh viên - Học sinh",
    tagline: "Tối ưu chi phí, đa nhiệm tốt",
    specsHighlight: "Giá từ 10 Triệu • Trợ giá tựu trường • Bảo hành 12T",
    icon: <GraduationCap className="w-6 h-6 text-amber-500" />,
    bgGradient: "from-amber-950/20 via-neutral-900/5 to-white hover:border-amber-500/40",
    badge: "Trợ giá sinh viên",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-200",
    href: "/shop?demand=student",
    category: "laptop",
  },
  {
    id: "developer",
    title: "Lập trình & Kỹ thuật",
    tagline: "Compile code siêu tốc, chạy máy ảo",
    specsHighlight: "RAM 16GB - 32GB • CPU Core i7/Ryzen 7/M-Series",
    icon: <Code2 className="w-6 h-6 text-emerald-600" />,
    bgGradient: "from-emerald-950/20 via-neutral-900/5 to-white hover:border-emerald-500/40",
    badge: "Đa nhiệm mạnh mẽ",
    badgeColor: "bg-emerald-500/10 text-shop_dark_green border-emerald-200",
    href: "/shop?demand=developer",
    category: "laptop",
  },
  {
    id: "creator",
    title: "Đồ họa & Sáng tạo 3D",
    tagline: "Màn hình chuẩn màu, render nhanh",
    specsHighlight: "OLED / Retina 100% DCI-P3 • GPU rời • Chuẩn màu Delta E < 1",
    icon: <Palette className="w-6 h-6 text-purple-500" />,
    bgGradient: "from-purple-950/20 via-neutral-900/5 to-white hover:border-purple-500/40",
    badge: "Chuẩn màu Creator",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-200",
    href: "/shop?demand=creator",
    category: "laptop",
  },
  {
    id: "entertainment",
    title: "Giải trí & Âm thanh",
    tagline: "Trải nghiệm nghe nhìn sống động",
    specsHighlight: "Màn hình 2K-4K • Âm thanh Dolby Atmos • Pin cả ngày",
    icon: <Headphones className="w-6 h-6 text-orange-500" />,
    bgGradient: "from-orange-950/20 via-neutral-900/5 to-white hover:border-orange-500/40",
    badge: "Nghe nhìn đỉnh cao",
    badgeColor: "bg-orange-500/10 text-orange-600 border-orange-200",
    href: "/shop?demand=entertainment",
    category: "tai-nghe",
  },
];

const HomeDemandShopping = () => {
  return (
    <section className="my-10 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-shop_dark_green text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Định vị nhu cầu</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Mua sắm theo nhu cầu sử dụng
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Lựa chọn cấu hình và thiết bị chuẩn xác nhất với mục đích học tập, làm việc và giải trí
          </p>
        </div>

        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-shop_dark_green hover:underline shrink-0"
        >
          <span>Xem tất cả thiết bị</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grid of 6 Demand Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMANDS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`group relative p-5 rounded-2xl border border-neutral-200 bg-white shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden bg-gradient-to-br ${item.bgGradient}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="p-3 rounded-2xl bg-white shadow-xs border border-neutral-100 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              </div>

              <h3 className="text-base font-bold text-neutral-900 group-hover:text-shop_dark_green transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-neutral-600 mt-1 font-medium">
                {item.tagline}
              </p>

              <div className="mt-3 p-2.5 rounded-xl bg-neutral-100/70 border border-neutral-200/60 text-[11px] text-neutral-700 font-medium">
                {item.specsHighlight}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-shop_dark_green">
              <span>Khám phá sản phẩm phù hợp</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default HomeDemandShopping;
