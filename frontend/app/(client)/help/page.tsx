import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Help | TECHWISEAI",
  description: "Trung tâm hỗ trợ TECHWISEAI - tìm câu trả lời nhanh hoặc liên hệ trực tiếp với đội ngũ hỗ trợ.",
};

const helpTopics = [
  {
    title: "Đơn hàng & Vận chuyển",
    description: "Theo dõi đơn hàng, thời gian giao hàng, phí vận chuyển.",
    href: "/faqs",
  },
  {
    title: "Đổi trả & Hoàn tiền",
    description: "Điều kiện đổi trả, quy trình hoàn tiền sau khi hủy đơn.",
    href: "/terms",
  },
  {
    title: "Bảo hành sản phẩm",
    description: "Chính sách bảo hành chính hãng theo từng loại sản phẩm.",
    href: "/faqs",
  },
  {
    title: "Tài khoản & Bảo mật",
    description: "Quản lý tài khoản, đổi mật khẩu, chính sách bảo mật.",
    href: "/privacy",
  },
];

const HelpPage = () => {
  return (
    <div className="bg-white">
      <Container>
        <div className="py-14 max-w-2xl mx-auto text-center">
          <h1 className="text-[32px] md:text-[40px] font-bold text-darkColor mb-3">
            Chúng tôi có thể giúp gì cho bạn?
          </h1>
          <p className="text-lightColor">
            Chọn một chủ đề bên dưới, hoặc liên hệ trực tiếp nếu bạn cần hỗ trợ
            ngay.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 pb-10">
          {helpTopics.map((topic) => (
            <Link
              key={topic.title}
              href={topic.href}
              className="border border-gray-200 rounded-lg p-5 hover:border-shop_light_green hover:shadow-md hoverEffect"
            >
              <h3 className="font-semibold text-darkColor mb-1">
                {topic.title}
              </h3>
              <p className="text-sm text-lightColor">{topic.description}</p>
            </Link>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-10 pb-16 text-center">
          <h2 className="font-semibold text-darkColor text-lg mb-2">
            Vẫn cần trợ giúp?
          </h2>
          <p className="text-sm text-lightColor mb-4">
            Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng, 8:00 - 21:00 tất cả các
            ngày trong tuần.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-shop_dark_green text-white text-sm font-medium px-6 py-2.5 rounded-md hover:opacity-90 hoverEffect"
          >
            Liên hệ hỗ trợ
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default HelpPage;