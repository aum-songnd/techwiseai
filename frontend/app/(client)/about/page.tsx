import React from "react";
import type { Metadata } from "next";
import Container from "@/components/Container";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "About us | TECHWISEAI",
  description:
    "Tìm hiểu về TECHWISEAI - cửa hàng công nghệ chuyên smartphone, laptop, tai nghe và phụ kiện chính hãng.",
};

const stats = [
  { label: "Sản phẩm đang bán", value: "2,000+" },
  { label: "Khách hàng đã phục vụ", value: "50,000+" },
  { label: "Thương hiệu hợp tác", value: "80+" },
  { label: "Năm hoạt động", value: "5+" },
];

const values = [
  {
    title: "Chính hãng 100%",
    description:
      "Mọi sản phẩm tại TECHWISEAI đều được nhập trực tiếp từ nhà phân phối ủy quyền, có đầy đủ hóa đơn và tem bảo hành.",
  },
  {
    title: "Giá minh bạch",
    description:
      "Không phụ phí ẩn. Giá hiển thị là giá cuối cùng bạn phải trả, đã bao gồm mọi chương trình khuyến mãi đang áp dụng.",
  },
  {
    title: "Hậu mãi tận tâm",
    description:
      "Đội ngũ hỗ trợ kỹ thuật sẵn sàng đồng hành cùng bạn trong suốt thời gian bảo hành, kể cả sau khi đơn hàng đã hoàn tất.",
  },
];

const AboutPage = () => {
  return (
    <div className="bg-white">
      <Container>
        <div className="max-w-2xl mx-auto text-center py-14">
          <Logo />
          <p className="mt-4 text-lightColor leading-relaxed">
            Chúng tôi tin rằng công nghệ tốt nên dễ tiếp cận. TECHWISEAI ra đời
            để giúp bạn chọn đúng chiếc điện thoại, laptop hay tai nghe phù hợp
            với nhu cầu thật sự, thay vì bị cuốn theo quảng cáo.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-14">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center border border-gray-200 rounded-lg py-6"
            >
              <p className="text-2xl md:text-3xl font-bold text-shop_dark_green">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-lightColor">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8 pb-16">
          {values.map((value) => (
            <div key={value.title}>
              <h3 className="font-semibold text-darkColor text-lg mb-2">
                {value.title}
              </h3>
              <p className="text-sm text-lightColor leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
};

export default AboutPage;