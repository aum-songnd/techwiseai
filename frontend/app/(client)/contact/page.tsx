"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, Headphones, Clock, CheckCircle2, Send, MessageSquare } from "lucide-react";
import Container from "@/components/Container";

const contactInfo = [
  {
    icon: Phone,
    title: "Tổng đài hỗ trợ",
    detail: "1900 1234",
    note: "8:00 - 21:00, tất cả các ngày trong tuần",
  },
  {
    icon: Mail,
    title: "Email dịch vụ",
    detail: "support@techwiseai.com",
    note: "Phản hồi trong vòng 24 giờ làm việc",
  },
  {
    icon: MapPin,
    title: "Showroom trải nghiệm",
    detail: "123 Nguyễn Văn Linh, Quận 7, TP. HCM",
    note: "8:30 - 20:00, mở cửa hàng ngày",
  },
];

const ContactPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;
    setIsSubmitted(true);
  };

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Container className="py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Liên hệ</span>
        </nav>

        {/* Header Bar - Matching Cart & Blog style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Liên hệ chúng tôi
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ Hỗ trợ 24/7 ]
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
            <Headphones className="h-4 w-4 text-shop_dark_green shrink-0" />
            <span>Đồng hành cùng trải nghiệm công nghệ của bạn</span>
          </div>
        </div>

        {/* 3 Contact Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {contactInfo.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="border border-neutral-200 bg-white p-6 space-y-2 hover:border-shop_dark_green/40 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                    {item.title}
                  </span>
                  <Icon className="h-4 w-4 text-shop_dark_green" />
                </div>
                <p className="text-sm font-bold text-neutral-900 font-mono group-hover:text-shop_dark_green transition-colors">
                  {item.detail}
                </p>
                <p className="text-xs text-neutral-500 font-sans">{item.note}</p>
              </div>
            );
          })}
        </div>

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form (2 cols) */}
          <div className="lg:col-span-2 border border-neutral-200 bg-white p-6 sm:p-8 space-y-5">
            <div className="border-b border-neutral-200 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Gửi yêu cầu hoặc tin nhắn trực tiếp
              </h2>
            </div>

            {isSubmitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-tight text-neutral-900">
                  Gửi tin nhắn thành công!
                </h3>
                <p className="text-xs text-neutral-600 max-w-md mx-auto">
                  Cảm ơn bạn đã liên hệ với TechWise AI. Đội ngũ chuyên viên kỹ thuật sẽ phản hồi tới email của bạn trong thời gian sớm nhất.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({ name: "", phone: "", email: "", subject: "", message: "" });
                  }}
                  className="mt-4 border border-neutral-300 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Gửi tin nhắn khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Họ và tên *</label>
                    <input
                      required
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Số điện thoại</label>
                    <input
                      type="tel"
                      placeholder="0912 345 678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Email *</label>
                    <input
                      required
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Chủ đề cần tư vấn</label>
                    <input
                      type="text"
                      placeholder="Tư vấn sản phẩm / Đơn hàng..."
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Nội dung chi tiết *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Mô tả nội dung bạn cần hỗ trợ hoặc thông tin sản phẩm..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-shop_dark_green text-white text-xs font-semibold uppercase tracking-wider px-8 py-3 hover:bg-shop_dark_green/90 transition-colors shadow-sm"
                  >
                    <Send size={13} />
                    <span>Gửi tin nhắn ngay</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Sidebar Notes (1 col) */}
          <aside className="space-y-6">
            {/* Working Hours */}
            <div className="border border-neutral-200 bg-white p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
                <Clock className="h-4 w-4 text-shop_dark_green shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Thời gian làm việc
                </h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-100">
                  <span className="text-neutral-500">Thứ 2 - Thứ 6:</span>
                  <span className="font-mono text-neutral-900 font-semibold">8:00 - 21:00</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-100">
                  <span className="text-neutral-500">Thứ 7 & Chủ nhật:</span>
                  <span className="font-mono text-neutral-900 font-semibold">8:30 - 20:30</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Trợ lý AI Chat:</span>
                  <span className="font-mono text-emerald-700 font-semibold">24/7 Không nghỉ</span>
                </div>
              </div>
            </div>

            {/* Quick Live Chat Prompt */}
            <div className="border border-neutral-200 p-6 space-y-3 bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-shop_dark_green shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Cần phản hồi lập tức?
                </h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                Bạn có thể sử dụng khung trò chuyện AI ở góc phải màn hình để được tra cứu sản phẩm và giải đáp thông số tự động ngay lập tức.
              </p>
              <div className="pt-2">
                <Link
                  href="/faqs"
                  className="inline-block text-xs font-bold uppercase tracking-wider text-shop_dark_green hover:underline"
                >
                  Xem câu hỏi thường gặp &rarr;
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
};

export default ContactPage;