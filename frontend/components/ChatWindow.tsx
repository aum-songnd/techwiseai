"use client";

import { Bot, Send, X, Sparkles } from "lucide-react";
import { useState } from "react";

interface ChatWindowProps {
  onClose: () => void;
}

export default function ChatWindow({ onClose }: ChatWindowProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;

    console.log("User:", message);
    setMessage("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Sparkles size={22} />
          </div>

          <div>
            <h2 className="font-semibold">TechWise AI</h2>
            <p className="text-xs text-white/80">
              Trợ lý tư vấn sản phẩm
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-full p-2 transition hover:bg-white/20"
          aria-label="Đóng chat"
        >
          <X size={20} />
        </button>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {/* AI message */}
        <div className="mb-4 flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Bot size={18} />
          </div>

          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
            Xin chào! 👋
            <br />
            Tôi là trợ lý AI của TechWise.
            <br />
            <br />
            Bạn đang cần tìm sản phẩm nào? Tôi có thể giúp bạn lựa chọn sản
            phẩm phù hợp.
          </div>
        </div>

        {/* Suggested questions */}
        <div className="mt-4 space-y-2">
          <p className="px-1 text-xs font-medium text-gray-500">
            Bạn có thể hỏi:
          </p>

          <button
            onClick={() =>
              setMessage("Tôi cần một chiếc laptop để lập trình")
            }
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition hover:border-blue-400 hover:bg-blue-50"
          >
            Laptop cho lập trình
          </button>

          <button
            onClick={() =>
              setMessage("Tôi cần laptop gaming trong khoảng 25 triệu")
            }
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition hover:border-blue-400 hover:bg-blue-50"
          >
            Laptop gaming khoảng 25 triệu
          </button>

          <button
            onClick={() =>
              setMessage("Tôi muốn mua laptop cho công việc văn phòng")
            }
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition hover:border-blue-400 hover:bg-blue-50"
          >
            Laptop mỏng nhẹ cho văn phòng
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white p-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />

          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Gửi tin nhắn"
          >
            <Send size={18} />
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] text-gray-400">
          TechWise AI có thể hỗ trợ bạn tìm kiếm và lựa chọn sản phẩm.
        </p>
      </div>
    </div>
  );
}
