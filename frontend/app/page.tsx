"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { CardContent } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { SendHorizonal } from "lucide-react";

type Message = {
  sender: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;

    setIsAutoScroll(isAtBottom);
  };
  useEffect(() => {
    if (isAutoScroll) scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setLoading(true);
    const userMessage: Message = { sender: "user", content: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const controller = new AbortController();
    controllerRef.current = controller;

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/stream-chat?contents=${encodeURIComponent(
        trimmedInput
      )}`
    );

    let response = "";

    eventSource.onmessage = (event) => {
      const chunk = event.data;
      response += chunk;

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.sender === "assistant") {
          return [
            ...prev.slice(0, -1),
            { sender: "assistant", content: response },
          ];
        } else {
          return [...prev, { sender: "assistant", content: response }];
        }
      });
    };

    eventSource.onerror = () => {
      eventSource.close();
      setLoading(false);
    };

    eventSource.onopen = () => {
      setLoading(false);
    };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Header className="sticky top-0 z-10" />

      <div
        className="flex-1 overflow-y-auto px-4 py-6 w-full"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="max-w-3xl mx-auto">
          <CardContent className="space-y-3 py-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-lg text-sm whitespace-pre-wrap  ${
                    msg.sender === "user" &&
                    "bg-black/5 dark:bg-white/10 rounded-br-none shadow-md"
                  }`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 z-10 px-4 py-4 max-w-3xl mx-auto w-full">
        <div className="relative">
          <Textarea
            placeholder="Ask something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="border p-3 pr-12 rounded-lg resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="absolute bottom-3 right-3 bg-muted dark:bg-white/10 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-gray-500 mt-2 text-center">
          Mindly can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
}
