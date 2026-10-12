import React from "react";
import type { Metadata } from "next";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Terms & Conditions | TECHWISEAI",
  description: "Điều khoản và điều kiện sử dụng dịch vụ của TECHWISEAI.",
};

const sections = [
  {
    title: "1. Chấp nhận điều khoản",
    body: "Khi truy cập và sử dụng website TECHWISEAI, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.",
  },
  {
    title: "2. Tài khoản người dùng",
    body: "Bạn có trách nhiệm bảo mật thông tin đăng nhập của mình và chịu trách nhiệm cho mọi hoạt động diễn ra dưới tài khoản đó. TECHWISEAI có quyền tạm khóa tài khoản nếu phát hiện dấu hiệu gian lận.",
  },
  {
    title: "3. Đặt hàng và thanh toán",
    body: "Đơn hàng chỉ được xác nhận sau khi TECHWISEAI kiểm tra tồn kho và nhận được thanh toán hợp lệ. Giá sản phẩm có thể thay đổi mà không cần báo trước, nhưng không ảnh hưởng đến đơn hàng đã được xác nhận.",
  },
  {
    title: "4. Vận chuyển và giao nhận",
    body: "Thời gian giao hàng là ước tính và có thể thay đổi tùy khu vực, đơn vị vận chuyển hoặc yếu tố khách quan. TECHWISEAI sẽ thông báo nếu có chậm trễ đáng kể.",
  },
  {
    title: "5. Đổi trả và bảo hành",
    body: "Sản phẩm được đổi trả trong vòng 7 ngày kể từ ngày nhận hàng nếu còn nguyên tem, hộp và phụ kiện. Điều kiện bảo hành chi tiết áp dụng theo chính sách của từng hãng sản xuất.",
  },
  {
    title: "6. Giới hạn trách nhiệm",
    body: "TECHWISEAI không chịu trách nhiệm cho các thiệt hại gián tiếp phát sinh từ việc sử dụng sản phẩm sai mục đích hoặc không đúng hướng dẫn của nhà sản xuất.",
  },
  {
    title: "7. Thay đổi điều khoản",
    body: "TECHWISEAI có quyền cập nhật điều khoản này bất kỳ lúc nào. Phiên bản mới nhất luôn được đăng tải trên trang này và có hiệu lực ngay khi công bố.",
  },
];

const TermsPage = () => {
  return (
    <div className="bg-white">
      <Container>
        <div className="py-14 max-w-3xl mx-auto">
          <h1 className="text-[32px] md:text-[40px] font-bold text-darkColor mb-2">
            Điều khoản & Điều kiện
          </h1>
          <p className="text-sm text-lightColor mb-10">
            Cập nhật lần cuối: tháng 9 năm 2026
          </p>

          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="font-semibold text-darkColor text-lg mb-2">
                  {section.title}
                </h2>
                <p className="text-sm text-lightColor leading-relaxed">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default TermsPage;