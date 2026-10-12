import React from "react";
import type { Metadata } from "next";
import Container from "@/components/Container";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact us | TECHWISEAI",
  description: "Liên hệ với TECHWISEAI để được hỗ trợ về đơn hàng, bảo hành hoặc tư vấn sản phẩm.",
};

const contactInfo = [
  {
    title: "Điện thoại",
    detail: "1900 1234",
    note: "8:00 - 21:00, tất cả các ngày trong tuần",
  },
  {
    title: "Email",
    detail: "support@techwiseai.com",
    note: "Phản hồi trong vòng 24 giờ làm việc",
  },
  {
    title: "Cửa hàng",
    detail: "123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh",
    note: "8:30 - 20:00, tất cả các ngày trong tuần",
  },
];

const ContactPage = () => {
  return (
    <div className="bg-white">
      <Container>
        <div className="py-14 max-w-2xl">
          <h1 className="text-[32px] md:text-[40px] font-bold text-darkColor">
            Liên hệ với chúng tôi
          </h1>
          <p className="mt-3 text-lightColor leading-relaxed">
            Có thắc mắc về sản phẩm, đơn hàng hay bảo hành? Gửi cho chúng tôi
            vài dòng, đội ngũ TECHWISEAI sẽ phản hồi sớm nhất có thể.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 pb-14">
          {contactInfo.map((item) => (
            <div
              key={item.title}
              className="border border-gray-200 rounded-lg p-5"
            >
              <h3 className="font-semibold text-darkColor mb-1">
                {item.title}
              </h3>
              <p className="text-shop_dark_green font-medium">
                {item.detail}
              </p>
              <p className="text-xs text-lightColor mt-1">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="max-w-xl pb-16">
          <h2 className="font-semibold text-darkColor text-xl mb-4">
            Gửi tin nhắn cho chúng tôi
          </h2>
          <form className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input placeholder="Họ và tên" />
              <Input placeholder="Số điện thoại" />
            </div>
            <Input type="email" placeholder="Email" />
            <Input placeholder="Chủ đề" />
            <textarea
              placeholder="Nội dung bạn muốn gửi..."
              rows={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-shop_light_green hoverEffect resize-none"
            />
            <Button type="submit" className="w-full sm:w-auto">
              Gửi liên hệ
            </Button>
          </form>
        </div>
      </Container>
    </div>
  );
};

export default ContactPage;