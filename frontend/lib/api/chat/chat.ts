import { fetchEnvelope } from "@/lib/api/core/client";
import { API_BASE_URL } from "@/lib/config/api";

export interface ChatMessageResponse {
  answer: string;
}

export function sendChatMessage(message: string): Promise<ChatMessageResponse> {
  return fetchEnvelope<ChatMessageResponse>("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
}

export async function streamChatMessage(
  message: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  } catch {
    throw new Error("Không thể kết nối đến hệ thống, vui lòng thử lại.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string; detail?: string }
      | null;
    throw new Error(
      body?.message ?? body?.detail ?? "Không thể nhận câu trả lời từ trợ lý AI.",
    );
  }

  if (!response.body) {
    throw new Error("Trình duyệt không hỗ trợ nhận câu trả lời dạng streaming.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedText = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        receivedText = true;
        onChunk(chunk);
      }
    }

    const remaining = decoder.decode();
    if (remaining) {
      receivedText = true;
      onChunk(remaining);
    }
  } finally {
    reader.releaseLock();
  }

  if (!receivedText) {
    throw new Error("Trợ lý AI chưa trả về nội dung, vui lòng thử lại.");
  }
}
