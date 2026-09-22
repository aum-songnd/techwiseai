import React from "react";
import type { Metadata } from "next";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "FAQs | TECHWISEAI",
  description: "Giải đáp các câu hỏi thường gặp về đặt hàng, vận chuyển, đổi trả và bảo hành tại TECHWISEAI.",
};

const faqs = [
  {
    question: "Làm sao để theo dõi đơn hàng của tôi?",
    answer:
      "Sau khi đặt hàng thành công, bạn sẽ nhận được email/SMS kèm mã đơn hàng và đường link theo dõi. Bạn cũng có thể xem trạng thái đơn hàng trong mục Tài khoản > Đơn hàng của tôi.",
  },
  {
    question: "TECHWISEAI giao hàng trong bao lâu?",
    answer:
      "Nội thành thường nhận hàng trong 1-2 ngày làm việc, các tỉnh thành khác từ 2-5 ngày làm việc tùy khu vực và đơn vị vận chuyển.",
  },
  {
    question: "Tôi có thể đổi trả sản phẩm không?",
    answer:
      "Có. Sản phẩm được đổi trả trong vòng 7 ngày kể từ khi nhận hàng nếu còn nguyên tem, hộp và đầy đủ phụ kiện đi kèm. Chi tiết xem tại trang Điều khoản & Điều kiện.",
  },
  {
    question: "Sản phẩm có được bảo hành chính hãng không?",
    answer:
      "Tất cả sản phẩm tại TECHWISEAI đều là hàng chính hãng, được bảo hành theo đúng chính sách của nhà sản xuất, kèm hóa đơn và tem bảo hành đầy đủ.",
  },
  {
    question: "TECHWISEAI có hỗ trợ trả góp không?",
    answer:
      "Có, chúng tôi hỗ trợ trả góp qua thẻ tín dụng hoặc các công ty tài chính liên kết. Thông tin chi tiết sẽ hiển thị tại bước thanh toán.",
  },
  {
    question: "Tôi cần liên hệ ai nếu có vấn đề với đơn hàng?",
    answer:
      "Bạn có thể liên hệ đội ngũ hỗ trợ qua trang Contact us, hotline 1900 1234, hoặc email support@techwiseai.com để được hỗ trợ nhanh nhất.",
  },
];

const FaqsPage = () => {
  return (
    <div className="bg-white">
      <Container>
        <div className="py-14 max-w-2xl mx-auto">
          <h1 className="text-[32px] md:text-[40px] font-bold text-darkColor text-center mb-2">
            Câu hỏi thường gặp
          </h1>
          <p className="text-lightColor text-center mb-10">
            Chưa tìm thấy câu trả lời? Ghé qua trang{" "}
            <a href="/contact" className="text-shop_dark_green font-medium hover:underline">
              Contact us
            </a>{" "}
            để được hỗ trợ trực tiếp.
          </p>

          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-darkColor">
                  {faq.question}
                  <span className="text-lightColor group-open:rotate-45 transition-transform text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-lightColor leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default FaqsPage;