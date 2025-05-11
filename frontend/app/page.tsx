"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { SendHorizonal } from "lucide-react";

export default function ChatPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setMessages((prev) => [...prev, `🧠 You: ${input}`, `🤖 Assistant: `]);

    const newMessages = [...messages, `🧠 You: ${input}`, `🤖 Assistant: `];
    setInput("");

    const controller = new AbortController();
    controllerRef.current = controller;

    const eventSource = new EventSource(
      `http://localhost:8000/stream-chat?contents=${encodeURIComponent(input)}`
    );

    let response = "";

    eventSource.onmessage = (event) => {
      const chunk = event.data;
      response += chunk;

      setMessages([...newMessages.slice(0, -1), `🤖 Assistant: ${response}`]);
    };

    eventSource.onerror = () => {
      eventSource.close();
      setLoading(false);
    };

    eventSource.onopen = () => {
      setLoading(false);
    };
  };

  return (
    <div className="h-screen flex flex-col">
      <Header className="sticky top-0 z-10 " />

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto">
        <CardContent className="space-y-3 py-6">
          {messages.map((msg, idx) => (
            <div key={idx} className="whitespace-pre-wrap">
              <ReactMarkdown>{msg}</ReactMarkdown>
            </div>
          ))}
        </CardContent>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 z-10  px-4 py-4 max-w-2xl mx-auto w-full">
        <div className="relative">
          <Textarea
            placeholder="Ask something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="border p-3 pr-12 rounded-lg resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="absolute bottom-3 right-3 bg-gray-200 dark:bg-white/10 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
