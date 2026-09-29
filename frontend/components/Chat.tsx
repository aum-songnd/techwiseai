"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import ChatWindow from "./ChatWindow";

export default function Chat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <ChatWindow onClose={() => setIsOpen(false)} />
      )}

      {/* Floating button + message */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* AI message */}
          <div className="absolute bottom-20 right-0 w-72 rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 shadow-xl ring-1 ring-gray-100">
            <p>
              Bạn cần tư vấn sản phẩm? Hãy để trợ lý AI giúp bạn nhé! 🤖
            </p>

            <div className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 bg-white" />
          </div>

          {/* Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="
              flex h-16 w-16 items-center justify-center
              rounded-full
              bg-gradient-to-br
              from-[#06271C]
              via-[#2FBF7F]
              to-[#0E3E2C]
              text-white
              shadow-xl shadow-blue-500/30
              transition-all duration-300
              hover:scale-110
            "
            aria-label="Mở trợ lý AI"
          >
            <MessageCircle size={28} />
          </button>
        </div>
      )}
    </>
  );
}
