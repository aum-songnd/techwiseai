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
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[#DCEBE4]">

      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-br from-[#06271C] via-[#2FBF7F] to-[#0E3E2C] px-5 py-4 text-white">

        <div className="flex items-center gap-3">

          {/* AI Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
            <Sparkles size={22} />
          </div>

          <div>
            <h2 className="font-semibold">TechWise AI</h2>

            <p className="text-xs text-white/80">
              Trợ lý tư vấn sản phẩm
            </p>
          </div>

        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="rounded-full p-2 transition hover:bg-white/15"
          aria-label="Đóng chat"
        >
          <X size={20} />
        </button>

      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-y-auto bg-[#F4F8F6] p-4">

        {/* AI message */}
        <div className="mb-4 flex items-start gap-2">

          {/* AI avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF7F0] text-[#0E3E2C]">
            <Bot size={18} />
          </div>

          {/* AI bubble */}
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-[#DCEBE4] bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
            Chào bạn!
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

          {/* Suggestion 1 */}
          <button
            onClick={() =>
              setMessage("Tôi cần một chiếc laptop để lập trình")
            }
            className="
              block w-full rounded-xl
              border border-[#DCEBE4]
              bg-white px-4 py-3
              text-left text-sm text-gray-700
              transition-all duration-200
              hover:border-[#2FBF7F]
              hover:bg-[#EAF7F0]
            "
          >
            Laptop cho lập trình
          </button>

          {/* Suggestion 2 */}
          <button
            onClick={() =>
              setMessage("Tôi cần laptop gaming trong khoảng 25 triệu")
            }
            className="
              block w-full rounded-xl
              border border-[#DCEBE4]
              bg-white px-4 py-3
              text-left text-sm text-gray-700
              transition-all duration-200
              hover:border-[#2FBF7F]
              hover:bg-[#EAF7F0]
            "
          >
            Laptop gaming khoảng 25 triệu
          </button>

          {/* Suggestion 3 */}
          <button
            onClick={() =>
              setMessage("Tôi muốn mua laptop cho công việc văn phòng")
            }
            className="
              block w-full rounded-xl
              border border-[#DCEBE4]
              bg-white px-4 py-3
              text-left text-sm text-gray-700
              transition-all duration-200
              hover:border-[#2FBF7F]
              hover:bg-[#EAF7F0]
            "
          >
            Laptop mỏng nhẹ cho văn phòng
          </button>
          <button
            onClick={() =>
              setMessage("Tôi muốn mua laptop cho công việc văn phòng")
            }
            className="
              block w-full rounded-xl
              border border-[#DCEBE4]
              bg-white px-4 py-3
              text-left text-sm text-gray-700
              transition-all duration-200
              hover:border-[#2FBF7F]
              hover:bg-[#EAF7F0]
            "
          >
            Laptop cho thiết kế đồ hoạ
          </button>


        </div>

      </div>

      {/* Input area */}
      <div className="border-t border-[#DCEBE4] bg-white p-3">

        <div className="flex items-center gap-2 rounded-xl border border-[#DCEBE4] bg-[#F4F8F6] px-3 py-2 transition focus-within:border-[#2FBF7F]">

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

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="
              flex h-9 w-9 items-center justify-center
              rounded-lg
              bg-gradient-to-br from-[#06271C] via-[#2FBF7F] to-[#0E3E2C]
              text-white
              transition-all duration-200
              hover:scale-105
              hover:shadow-md
              disabled:cursor-not-allowed
              disabled:opacity-40
              disabled:hover:scale-100
            "
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