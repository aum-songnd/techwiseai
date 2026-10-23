import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, Phone, Mail, MessageSquare, ShieldCheck, ChevronDown } from "lucide-react";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Câu hỏi thường gặp (FAQs) | TechWise AI",
  description: "Giải đáp các thắc mắc phổ biến về đặt hàng, thanh toán, vận chuyển, đổi trả và bảo hành tại TechWise AI.",
};

const faqs = [
  {
    question: "Làm sao để theo dõi tiến độ đơn hàng của tôi?",
    answer:
      "Sau khi đặt hàng thành công, hệ thống sẽ gửi xác nhận kèm mã vận đơn. Bạn có thể tra cứu trạng thái đơn hàng trực tiếp tại trang 'Đơn hàng của tôi' trong tài khoản cá nhân.",
  },
  {
    question: "Thời gian giao hàng tại TechWise AI là bao lâu?",
    answer:
      "Khu vực nội thành TP.HCM và Hà Nội nhận hàng trong 1-2 ngày làm việc. Các tỉnh thành khác từ 2-4 ngày làm việc. Mọi đơn hàng đều được đóng gói chống sốc chuẩn quốc tế.",
  },
  {
    question: "Chính sách đổi trả sản phẩm được áp dụng như thế nào?",
    answer:
      "TechWise AI áp dụng chính sách đổi trả miễn phí trong vòng 7 ngày đầu nếu sản phẩm phát sinh lỗi kỹ thuật từ nhà sản xuất, với điều kiện còn nguyên tem, hộp và phụ kiện kèm theo.",
  },
  {
    question: "Sản phẩm có được bảo hành chính hãng không?",
    answer:
      "100% thiết bị tại TechWise AI là hàng chính hãng được ủy quyền, áp dụng bảo hành điện tử hoặc qua số seri tại các trung tâm bảo hành của hãng trên toàn quốc.",
  },
  {
    question: "TechWise AI hỗ trợ những phương thức thanh toán nào?",
    answer:
      "Chúng tôi hỗ trợ đa dạng phương thức: Thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng qua mã VietQR, thẻ ATM nội địa và thẻ quốc tế Visa/Mastercard.",
  },
  {
    question: "Tôi cần liên hệ ai khi gặp sự cố kỹ thuật hoặc cần tư vấn?",
    answer:
      "Bạn có thể nhắn tin trực tiếp qua cửa sổ AI Chatbot 24/7 ở góc màn hình, gọi hotline 1900 1234, hoặc gửi email đến support@techwiseai.com.",
  },
];

const FaqsPage = () => {
  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Container className="py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Câu hỏi thường gặp</span>
        </nav>

        {/* Header Bar - Matching Cart & Blog style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Câu hỏi thường gặp (FAQs)
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ {faqs.length} câu hỏi ]
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
            <HelpCircle className="h-4 w-4 text-shop_dark_green shrink-0" />
            <span>Hỗ trợ kỹ thuật & giải đáp 24/7</span>
          </div>
        </div>

        {/* 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main FAQs Accordion (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group border border-neutral-200 bg-white overflow-hidden transition-all duration-200"
              >
                <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer list-none select-none text-xs sm:text-sm font-bold uppercase tracking-tight text-neutral-900 hover:text-shop_dark_green transition-colors">
                  <span className="pr-4">{faq.question}</span>
                  <ChevronDown className="h-4 w-4 text-neutral-400 group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans border-t border-neutral-100 bg-neutral-50/40">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>

          {/* Sidebar Support Box */}
          <aside className="space-y-6">
            <div className="border border-neutral-200 bg-white p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3">
                Cần hỗ trợ trực tiếp?
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                Nếu không tìm thấy câu trả lời phù hợp, đội ngũ chuyên viên của TechWise AI luôn sẵn sàng trợ giúp bạn.
              </p>

              <div className="space-y-3 pt-2 text-xs font-mono text-neutral-700">
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Hotline: 1900 1234 (8:00 - 21:00)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Email: support@techwiseai.com</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Chatbot AI: Trực tuyến 24/7</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/contact"
                  className="block w-full bg-shop_dark_green text-white text-center py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm"
                >
                  Gửi yêu cầu hỗ trợ &rarr;
                </Link>
              </div>
            </div>

            {/* Guarantee Box */}
            <div className="border border-neutral-200 p-5 space-y-2.5 text-[11px] text-neutral-500 bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-shop_dark_green shrink-0" />
                <span>Cam kết giải quyết thắc mắc trong vòng 24h</span>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
};

export default FaqsPage;