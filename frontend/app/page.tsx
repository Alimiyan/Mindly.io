"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  SendHorizonal,
  Sun,
  Mic,
  BookOpen,
  Leaf,
  Save,
  Clipboard,
  Moon as MoonIcon,
  Brain,
  TimerReset,
  BellRing,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

type Message = {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: Date;
  liked?: boolean;
  unLiked?: boolean;
};

type MoodEntry = {
  date: Date;
  score: number;
  note: string;
};

type StreakData = {
  currentStreak: number;
  totalSessions: number;
  minutesMindful: number;
  lastActive: Date | null;
};

export default function ChatPage() {
  const session_id = useRef(uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [currentTab, setCurrentTab] = useState("chat");
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [currentMood, setCurrentMood] = useState(5);
  const [moodNote, setMoodNote] = useState("");
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    totalSessions: 0,
    minutesMindful: 0,
    lastActive: null,
  });
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<
    "inhale" | "hold" | "exhale"
  >("inhale");
  const [breathingCounter, setBreathingCounter] = useState(4);
  const [breathingCycles, setBreathingCycles] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

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

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Initial setup
  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem("mindly-theme") as
      | "dark"
      | "light"
      | null;
    if (savedTheme) setTheme(savedTheme);

    // Load streak data
    const savedStreakData = localStorage.getItem("mindly-streak");
    if (savedStreakData) {
      try {
        const parsed = JSON.parse(savedStreakData);
        parsed.lastActive = parsed.lastActive
          ? new Date(parsed.lastActive)
          : null;
        setStreakData(parsed);

        // Update streak if needed
        updateStreakData();
      } catch (error) {
        console.error("Error parsing streak data:", error);
      }
    }

    // Load saved conversations
    const savedMessages = localStorage.getItem("mindly-messages");
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(parsedMessages);
      } catch (error) {
        console.error("Error parsing messages:", error);
      }
    }

    // Load mood entries
    const savedMoodEntries = localStorage.getItem("mindly-mood");
    if (savedMoodEntries) {
      try {
        const parsedEntries = JSON.parse(savedMoodEntries).map(
          (entry: any) => ({
            ...entry,
            date: new Date(entry.date),
          })
        );
        setMoodEntries(parsedEntries);
      } catch (error) {
        console.error("Error parsing mood entries:", error);
      }
    }
  }, []);

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("mindly-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Theme toggler
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("mindly-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Update streak data
  const updateStreakData = () => {
    const now = new Date();
    const lastActive = streakData.lastActive
      ? new Date(streakData.lastActive)
      : null;

    // If first time or it's a new day
    if (!lastActive || !isSameDay(lastActive, now)) {
      // Check if it's consecutive day
      if (lastActive && isDayBefore(lastActive, now)) {
        const newStreakData = {
          ...streakData,
          currentStreak: streakData.currentStreak + 1,
          totalSessions: streakData.totalSessions + 1,
          lastActive: now,
        };
        setStreakData(newStreakData);
        localStorage.setItem("mindly-streak", JSON.stringify(newStreakData));

        if (newStreakData.currentStreak % 5 === 0) {
          showNotification(
            `🔥 ${newStreakData.currentStreak} day streak! Keep going!`
          );
        }
      } else if (!lastActive) {
        // First time user
        const newStreakData = {
          ...streakData,
          currentStreak: 1,
          totalSessions: 1,
          lastActive: now,
        };
        setStreakData(newStreakData);
        localStorage.setItem("mindly-streak", JSON.stringify(newStreakData));
        showNotification("Welcome to Mindly! Your journey begins today.");
      } else if (!isDayBefore(lastActive, now)) {
        // Broken streak
        const newStreakData = {
          ...streakData,
          currentStreak: 1,
          totalSessions: streakData.totalSessions + 1,
          lastActive: now,
        };
        setStreakData(newStreakData);
        localStorage.setItem("mindly-streak", JSON.stringify(newStreakData));
        showNotification("New day, new start! Your streak begins again.");
      }
    } else {
      // Same day, just update the session count
      const newStreakData = {
        ...streakData,
        totalSessions: streakData.totalSessions + 1,
        lastActive: now,
      };
      setStreakData(newStreakData);
      localStorage.setItem("mindly-streak", JSON.stringify(newStreakData));
    }
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Helper function to check if date1 is the day before date2
  const isDayBefore = (date1: Date, date2: Date) => {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const dayDiff = Math.round((date2.getTime() - date1.getTime()) / oneDayMs);
    return dayDiff === 1;
  };

  // Handle message sending
  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setLoading(true);
    const userMessage: Message = {
      id: uuidv4(),
      sender: "user",
      content: trimmedInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Update streak data
    updateStreakData();

    const eventSource = new EventSource(
      `${
        process.env.NEXT_PUBLIC_BACKEND_URL || "/api"
      }/stream-chat?contents=${encodeURIComponent(trimmedInput)}&session_id=${
        session_id.current
      }`
    );

    let response = "";
    const assistantMessageId = uuidv4();

    eventSource.onmessage = (event) => {
      const chunk = event.data;
      response += chunk;

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.sender === "assistant") {
          return [
            ...prev.slice(0, -1),
            {
              id: assistantMessageId,
              sender: "assistant",
              content: response,
              timestamp: new Date(),
            },
          ];
        } else {
          return [
            ...prev,
            {
              id: assistantMessageId,
              sender: "assistant",
              content: response,
              timestamp: new Date(),
            },
          ];
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

  // Bookmark a message
  const toggleLiked = (messageId: string) => {
    setMessages(
      messages.map((msg) =>
        msg.id === messageId ? { ...msg, liked: !msg.liked } : msg
      )
    );
  };

  const toggleUnLiked = (messageId: string) => {
    setMessages(
      messages.map((msg) =>
        msg.id === messageId ? { ...msg, unLiked: !msg.unLiked } : msg
      )
    );
  };

  // Save mood entry
  const saveMoodEntry = () => {
    const newEntry: MoodEntry = {
      date: new Date(),
      score: currentMood,
      note: moodNote,
    };

    const updatedEntries = [...moodEntries, newEntry];
    setMoodEntries(updatedEntries);
    localStorage.setItem("mindly-mood", JSON.stringify(updatedEntries));

    setMoodNote("");
    showNotification("Mood tracked successfully!");
  };

  // Breathing exercise control
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isBreathingActive) {
      timer = setInterval(() => {
        setBreathingCounter((prev) => {
          if (prev <= 1) {
            // Move to next phase
            if (breathingPhase === "inhale") {
              setBreathingPhase("hold");
              return 7; // Hold for 7 seconds
            } else if (breathingPhase === "hold") {
              setBreathingPhase("exhale");
              return 8; // Exhale for 8 seconds
            } else {
              setBreathingPhase("inhale");
              setBreathingCycles((prev) => prev + 1);
              return 4; // Inhale for 4 seconds
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isBreathingActive, breathingPhase, breathingCounter]);

  // Handle breathing exercise completion
  useEffect(() => {
    if (breathingCycles >= 5 && isBreathingActive) {
      setIsBreathingActive(false);
      const newStreakData = {
        ...streakData,
        minutesMindful: streakData.minutesMindful + 2,
      };
      setStreakData(newStreakData);
      localStorage.setItem("mindly-streak", JSON.stringify(newStreakData));
      showNotification("Great job! You completed 5 breathing cycles.");
    }
  }, [breathingCycles]);

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem("mindly-messages");
    showNotification("Conversation cleared");
  };

  // Copy message to clipboard
  const copyMessageToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    showNotification("Copied to clipboard");
  };

  // Show notification
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  // Quick prompts
  const quickPrompts = [
    { emoji: "🧘", text: "Give me a quick mindfulness exercise" },
    { emoji: "📓", text: "Suggest a journal prompt for today" },
    { emoji: "💡", text: "I need motivation to exercise" },
    { emoji: "😌", text: "Help me with my anxiety right now" },
    { emoji: "🧠", text: "Share a mental health tip" },
    { emoji: "💭", text: "Help me reframe negative thoughts" },
  ];

  // Handle quick prompt selection
  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className={`${theme === "dark" ? "dark" : ""} h-screen flex flex-col`}>
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className=" px-4 py-2 flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="w-5 h-5 mr-2" />

              <h1 className="text-lg font-semibold ml-2">Mindly.io</h1>
            </div>

            <div className="flex items-center">
              <Tabs
                value={currentTab}
                onValueChange={setCurrentTab}
                className="mr-2"
              >
                <TabsList>
                  <TabsTrigger value="chat" className="text-xs">
                    <BookOpen className="w-4 h-4 mr-1" /> Chat
                  </TabsTrigger>
                  <TabsTrigger value="mood" className="text-xs">
                    <Brain className="w-4 h-4 mr-1" /> Mood
                  </TabsTrigger>
                  <TabsTrigger value="breathe" className="text-xs">
                    <TimerReset className="w-4 h-4 mr-1" /> Breathe
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </Button>
            </div>
          </header>

          {/* Main Content Tabs Container */}
          <Tabs value={currentTab} className="flex-1 flex flex-col">
            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0">
              <ScrollArea
                className="flex-1 px-4 py-6"
                ref={scrollContainerRef}
                onScrollCapture={handleScroll}
              >
                <div className="max-w-3xl mx-auto">
                  <CardContent className="space-y-3 py-6">
                    {messages.length === 0 && (
                      <div className="max-w-3xl mx-auto mt-12 mb-8 p-6 rounded-lg bg-white dark:bg-background text-center">
                        <h2 className="text-2xl font-semibold mb-2">
                          👋 Welcome to Mindly
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          Your mental health companion. Ask anything about
                          mindfulness, motivation, or well-being.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 text-sm">
                          {quickPrompts.map((prompt, index) => (
                            <Button
                              key={index}
                              variant="secondary"
                              className="text-xs"
                              onClick={() => handleQuickPrompt(prompt.text)}
                            >
                              {prompt.emoji} {prompt.text.substring(0, 20)}...
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`group flex relative ${
                          msg.sender === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`px-4 py-2 rounded-lg text-sm whitespace-pre-wrap max-w-[80%] relative ${
                            msg.sender === "user"
                              ? "bg-black/5 dark:bg-white/10 rounded-br-none shadow-sm"
                              : ""
                          }`}
                        >
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                          {msg.sender === "assistant" && (
                            <div className=" opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 cursor-pointer"
                                onClick={() =>
                                  copyMessageToClipboard(msg.content)
                                }
                              >
                                <Clipboard className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 cursor-pointer"
                                onClick={() => toggleLiked(msg.id)}
                              >
                                <ThumbsUp
                                  className={`h-4 w-4 ${
                                    msg.liked ? "fill-current" : ""
                                  }`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 cursor-pointer"
                                onClick={() => toggleUnLiked(msg.id)}
                              >
                                <ThumbsDown
                                  className={`h-4 w-4 ${
                                    msg.unLiked ? "fill-current" : ""
                                  }`}
                                />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </CardContent>
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="sticky bottom-0 z-10 px-4 py-4 bg-background max-w-3xl mx-auto w-full">
                <div className="relative">
                  <Textarea
                    placeholder="Ask something..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    className="border pr-24 rounded-lg resize-none min-h-[60px]"
                    rows={1}
                  />
                  <div className="absolute bottom-3 right-3 flex space-x-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full h-8 w-8"
                      disabled={loading}
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleSend}
                      disabled={loading || !input.trim()}
                      size="icon"
                      className="rounded-full h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <SendHorizonal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Mindly can make mistakes. Check important info.
                </div>
              </div>
            </TabsContent>

            {/* Mood Tracker Tab */}
            <TabsContent
              value="mood"
              className="flex-1 overflow-y-auto p-4 m-0"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-medium">
                      How are you feeling today?
                    </h3>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>😔</span>
                          <span>😐</span>
                          <span>😊</span>
                        </div>
                        <Slider
                          value={[currentMood]}
                          min={1}
                          max={10}
                          step={1}
                          onValueChange={(values) => setCurrentMood(values[0])}
                        />
                      </div>

                      <Textarea
                        placeholder="Add a note about how you're feeling (optional)"
                        value={moodNote}
                        onChange={(e) => setMoodNote(e.target.value)}
                        className="resize-none"
                        rows={3}
                      />

                      <Button onClick={saveMoodEntry} className="w-full">
                        <Save className="w-4 h-4 mr-2" /> Save mood entry
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">
                      Your mood history
                    </h3>

                    {moodEntries.length > 0 ? (
                      <div className="space-y-4">
                        {moodEntries
                          .slice()
                          .reverse()
                          .slice(0, 5)
                          .map((entry, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between border-b pb-2"
                            >
                              <div>
                                <div className="font-medium">
                                  {entry.score < 4
                                    ? "😔"
                                    : entry.score < 7
                                    ? "😐"
                                    : "😊"}{" "}
                                  Level {entry.score}/10
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {entry.date.toLocaleDateString()} at{" "}
                                  {entry.date.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                                {entry.note && (
                                  <div className="text-sm mt-1">
                                    {entry.note}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center p-6 text-muted-foreground">
                        No mood entries yet. Start tracking how you feel!
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Breathing Tab */}
            <TabsContent
              value="breathe"
              className="flex-1 overflow-y-auto p-4 m-0"
            >
              <div className="max-w-3xl mx-auto">
                <Card className="mb-6">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <h3 className="text-xl font-medium">Guided Breathing</h3>
                      <p className="text-muted-foreground">
                        4-7-8 breathing technique for relaxation
                      </p>
                    </div>

                    {!isBreathingActive ? (
                      <div className="space-y-6">
                        <div className="flex justify-center">
                          <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center">
                            <Leaf className="w-12 h-12 text-primary" />
                          </div>
                        </div>

                        <div>
                          <p>
                            This exercise helps reduce anxiety and aids sleep:
                          </p>
                          <ul className="text-left list-disc list-inside mt-2">
                            <li>Inhale for 4 seconds</li>
                            <li>Hold for 7 seconds</li>
                            <li>Exhale for 8 seconds</li>
                          </ul>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => {
                            setIsBreathingActive(true);
                            setBreathingPhase("inhale");
                            setBreathingCounter(4);
                            setBreathingCycles(0);
                          }}
                        >
                          Start Breathing Exercise
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-center">
                          <div
                            className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-1000 ${
                              breathingPhase === "inhale"
                                ? "bg-blue-100 dark:bg-blue-900 scale-100"
                                : breathingPhase === "hold"
                                ? "bg-green-100 dark:bg-green-900 scale-110"
                                : "bg-purple-100 dark:bg-purple-900 scale-90"
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl font-bold">
                                {breathingCounter}
                              </div>
                              <div className="text-sm capitalize">
                                {breathingPhase}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="mb-2">
                            Cycles completed: {breathingCycles}/5
                          </p>
                          <Progress value={(breathingCycles / 5) * 100} />
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setIsBreathingActive(false)}
                        >
                          Stop Exercise
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <div className="mr-4 p-2 bg-primary/10 rounded">
                          <Leaf className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Box Breathing</h3>
                          <p className="text-sm text-muted-foreground">
                            Equal parts inhale, hold, exhale, hold
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <div className="mr-4 p-2 bg-primary/10 rounded">
                          <Leaf className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Deep Breathing</h3>
                          <p className="text-sm text-muted-foreground">
                            Long inhales and exhales from diaphragm
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">
                      Benefits of Breathwork
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="mr-3 mt-1">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium">1</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium">
                            Reduces Stress & Anxiety
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Activates the parasympathetic nervous system to calm
                            your body's stress response
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="mr-3 mt-1">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium">2</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium">Improves Focus</h4>
                          <p className="text-sm text-muted-foreground">
                            Breathing exercises help center your thoughts and
                            enhance concentration
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="mr-3 mt-1">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium">3</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium">Better Sleep</h4>
                          <p className="text-sm text-muted-foreground">
                            Regular practice can help improve sleep quality and
                            reduce insomnia
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Notification */}
          {notification && (
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-black text-white px-4 py-2 rounded-full text-sm flex items-center shadow-lg animate-fade-in-up">
              <BellRing className="w-4 h-4 mr-2" />
              {notification}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
