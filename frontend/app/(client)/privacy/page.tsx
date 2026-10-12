import React from "react";
import type { Metadata } from "next";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Privacy Policy | TECHWISEAI",
  description: "Chính sách bảo mật thông tin khách hàng của TECHWISEAI.",
};

const sections = [
  {
    title: "1. Thông tin chúng tôi thu thập",
    body: "Chúng tôi thu thập thông tin bạn cung cấp khi đặt hàng hoặc liên hệ, bao gồm họ tên, số điện thoại, email và địa chỉ giao hàng. Ngoài ra, một số dữ liệu duyệt web (như loại trình duyệt, thời gian truy cập) được ghi nhận tự động để cải thiện trải nghiệm sử dụng.",
  },
  {
    title: "2. Mục đích sử dụng thông tin",
    body: "Thông tin được sử dụng để xử lý đơn hàng, hỗ trợ khách hàng, gửi thông báo về đơn hàng/khuyến mãi, và cải thiện chất lượng sản phẩm, dịch vụ.",
  },
  {
    title: "3. Chia sẻ thông tin với bên thứ ba",
    body: "TECHWISEAI không bán hoặc cho thuê thông tin cá nhân của bạn. Thông tin chỉ được chia sẻ với đơn vị vận chuyển và đối tác thanh toán ở mức cần thiết để hoàn tất đơn hàng.",
  },
  {
    title: "4. Bảo mật dữ liệu",
    body: "Chúng tôi áp dụng các biện pháp kỹ thuật và quản lý phù hợp để bảo vệ thông tin của bạn khỏi truy cập, sử dụng hoặc tiết lộ trái phép.",
  },
  {
    title: "5. Cookie",
    body: "Website sử dụng cookie để ghi nhớ giỏ hàng, tùy chọn hiển thị và phân tích lưu lượng truy cập. Bạn có thể tắt cookie trong trình duyệt, tuy nhiên một số tính năng có thể hoạt động không đầy đủ.",
  },
  {
    title: "6. Quyền của bạn",
    body: "Bạn có quyền yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân của mình. Vui lòng liên hệ qua trang Contact us để được hỗ trợ thực hiện các quyền này.",
  },
  {
    title: "7. Thay đổi chính sách",
    body: "Chính sách bảo mật có thể được cập nhật theo thời gian. Mọi thay đổi sẽ được đăng tải trên trang này kèm ngày cập nhật mới nhất.",
  },
];

const PrivacyPage = () => {
  return (
    <div className="bg-white">
      <Container>
        <div className="py-14 max-w-3xl mx-auto">
          <h1 className="text-[32px] md:text-[40px] font-bold text-darkColor mb-2">
            Chính sách bảo mật
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

export default PrivacyPage;