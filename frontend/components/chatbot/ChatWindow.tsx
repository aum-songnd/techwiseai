"use client";

import { Bot, Send, X, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { streamChatMessage } from "@/lib/api/chat/chat";

const PRODUCT_LINK_PATTERN =
  /\[([^\]]+)\]\(\/product\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/gi;

interface ChatWindowProps {
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function renderAssistantMessage(text: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(PRODUCT_LINK_PATTERN)) {
    const index = match.index;
    if (index === undefined) continue;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    parts.push(
      <Link
        key={`${index}-${match[2]}`}
        href={`/product/${match[2]}`}
        className="font-medium text-[#0E7A4B] underline decoration-[#2FBF7F] underline-offset-2 hover:text-[#06271C]"
      >
        {match[1]}
      </Link>,
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function ChatWindow({ onClose }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || isSending) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
    setMessage("");
    setIsSending(true);
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: assistantId, role: "assistant", text: "" },
    ]);

    try {
      await streamChatMessage(text, (chunk) => {
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, text: item.text + chunk }
              : item,
          ),
        );
      });
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Không thể kết nối trợ lý AI, vui lòng thử lại.";
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                text: item.text
                  ? `${item.text}\n\n${errorText}`
                  : errorText,
              }
            : item,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[#DCEBE4]">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-br from-[#06271C] via-[#2FBF7F] to-[#0E3E2C] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="font-semibold">TechWise AI</h2>
            <p className="text-xs text-white/80">Trợ lý tư vấn sản phẩm</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 transition hover:bg-white/15"
          aria-label="Đóng chat"
        >
          <X size={20} />
        </button>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-y-auto bg-[#F4F8F6] p-4" aria-live="polite">
        <div className="mb-4 flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF7F0] text-[#0E3E2C]">
            <Bot size={18} />
          </div>
          <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-[#DCEBE4] bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
            Chào bạn! Tôi là trợ lý AI của TechWise. Bạn đang cần tìm sản phẩm
            nào? Tôi có thể giúp bạn lựa chọn sản phẩm phù hợp.
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="mt-4 space-y-2">
            <p className="px-1 text-xs font-medium text-gray-500">
              Bạn có thể hỏi:
            </p>
            {[
              "Tôi cần một chiếc laptop để lập trình",
              "Tôi cần laptop gaming trong khoảng 25 triệu",
              "Tôi muốn mua laptop cho công việc văn phòng",
              "Tôi cần laptop cho thiết kế đồ hoạ",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setMessage(suggestion)}
                className="block w-full rounded-xl border border-[#DCEBE4] bg-white px-4 py-3 text-left text-sm text-gray-700 transition-all duration-200 hover:border-[#2FBF7F] hover:bg-[#EAF7F0]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-2 ${
                  item.role === "user" ? "justify-end" : ""
                }`}
              >
                {item.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF7F0] text-[#0E3E2C]">
                    <Bot size={18} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    item.role === "user"
                      ? "rounded-tr-sm bg-[#0E3E2C] text-white"
                      : "rounded-tl-sm border border-[#DCEBE4] bg-white text-gray-700"
                  }`}
                >
                  {item.role === "assistant"
                    ? renderAssistantMessage(item.text)
                    : item.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Bot size={18} />
                Đang tìm sản phẩm phù hợp...
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#DCEBE4] bg-white p-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#DCEBE4] bg-[#F4F8F6] px-3 py-2 transition focus-within:border-[#2FBF7F]">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            maxLength={2000}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#06271C] via-[#2FBF7F] to-[#0E3E2C] text-white transition-all duration-200 hover:scale-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
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