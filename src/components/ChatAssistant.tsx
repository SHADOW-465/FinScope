"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Settings, Sparkles, AlertCircle, RefreshCw, HelpCircle } from "lucide-react";

interface ChatAssistantProps {
  analysisData: any;
}

interface Message {
  sender: "user" | "ai";
  text: string;
  isError?: boolean;
}

export default function ChatAssistant({ analysisData }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: `### Hello! I am FinScope AI.
I have parsed the bank statements for **${analysisData?.overview?.accountHolder || "the customer"}** from **${analysisData?.overview?.bankName || "the bank"}**.

I can answer underwriting questions or evaluate repayment capacity. Click a preset query below or type your own question!`,
    },
  ]);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // API settings persisted in localStorage
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("gemini");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load API settings on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("finscope_api_key");
    const savedProvider = localStorage.getItem("finscope_provider");
    if (savedKey) setApiKey(savedKey);
    if (savedProvider) setProvider(savedProvider);
  }, []);

  // Save settings
  const handleSaveSettings = () => {
    localStorage.setItem("finscope_api_key", apiKey);
    localStorage.setItem("finscope_provider", provider);
    setShowSettings(false);
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const presets = [
    "What is the average monthly income?",
    "Identify existing EMIs or loans?",
    "Can this customer repay a ₹10 lakh loan?",
    "List all statement risk factors?",
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text: textToSend }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          overview: analysisData.overview,
          metrics: analysisData.metrics,
          risk_score: analysisData.risk_score,
          income_analysis: analysisData.income_analysis,
          liability_analysis: analysisData.liability_analysis,
          bounce_analysis: analysisData.bounce_analysis,
          balance_risks: analysisData.balance_risks,
          monthly_analysis: analysisData.monthly_analysis,
          api_key: apiKey,
          provider: provider,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch response.");
      }

      setMessages((prev) => [...prev, { sender: "ai", text: data.response }]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ **Error**: ${err.message || "Failed to retrieve answer. Please try again."}`,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse inline bold and backtick codes
  const parseInlineFormatting = (text: string) => {
    const tokenRegex = /(\*\*.*?\*\*|`.*?`)/g;
    const splitParts = text.split(tokenRegex);
    return splitParts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={idx} className="px-1.5 py-0.5 bg-slate-950 border border-slate-800/80 text-[10px] rounded font-mono text-indigo-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Helper to render lines with headings and list styles
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, lineIdx) => {
      if (line.trim().startsWith("### ")) {
        return (
          <h4 key={lineIdx} className="text-sm font-bold text-indigo-300 mt-3 mb-1.5 border-b border-slate-800 pb-1 flex items-center gap-1">
            {parseInlineFormatting(line.slice(4))}
          </h4>
        );
      }
      if (line.trim().startsWith("## ")) {
        return (
          <h3 key={lineIdx} className="text-base font-extrabold text-white mt-4 mb-2 border-b border-slate-800 pb-1.5">
            {parseInlineFormatting(line.slice(3))}
          </h3>
        );
      }

      const bulletMatch = line.match(/^[\*\-]\s+(.*)$/);
      if (bulletMatch) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 pl-2 py-0.5 text-slate-200">
            <span className="text-indigo-400 mt-1 select-none text-[10px]">•</span>
            <span className="flex-1 leading-relaxed">{parseInlineFormatting(bulletMatch[1])}</span>
          </div>
        );
      }

      return (
        <p key={lineIdx} className={`min-h-[6px] my-1 text-slate-200 leading-relaxed`}>
          {parseInlineFormatting(line)}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-300 z-50 cursor-pointer flex items-center justify-center border border-indigo-400/20 no-print"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
 
      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[440px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-120px)] glass-panel rounded-2xl flex flex-col shadow-2xl border border-slate-800/80 z-50 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 duration-300 no-print">
          {/* Header */}
          <div className="p-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">FinScope AI Assistant</h3>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Statement Context
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ${
                  showSettings ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"
                }`}
                title="AI settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Settings Overlay */}
          {showSettings && (
            <div className="p-4 bg-slate-950 border-b border-slate-800/80 space-y-3.5 animate-in slide-in-from-top-3 duration-250">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                AI API Key Configurations
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setProvider("gemini")}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                    provider === "gemini"
                      ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  Google Gemini (Free)
                </button>
                <button
                  onClick={() => setProvider("groq")}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                    provider === "groq"
                      ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  Groq LLAMA3 (Fast)
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Enter API Key:
                </label>
                <input
                  type="password"
                  placeholder={
                    provider === "gemini"
                      ? "Enter Gemini API Key..."
                      : "Enter Groq API Key..."
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[9px] text-slate-500 leading-normal">
                  Your key is saved locally in your browser and sent with queries. Leave blank to run our local rule-based heuristic analyst.
                </p>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-900 pt-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-medium text-white cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                } animate-in fade-in duration-150`}
              >
                <span className="text-[9px] text-slate-550 font-bold uppercase tracking-widest mb-1 px-1">
                  {msg.sender === "user" ? "Underwriter" : "FinScope Agent"}
                </span>
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                    msg.sender === "user"
                      ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-100 rounded-tr-none"
                      : msg.isError
                      ? "bg-red-950/20 border-red-500/20 text-red-300 rounded-tl-none"
                      : "bg-slate-900/60 border-slate-800/80 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {renderFormattedText(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col items-start animate-pulse">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 px-1">
                  FinScope Agent
                </span>
                <div className="bg-slate-900/60 border border-slate-850 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2 text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  Generating financial analysis...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick presets */}
          <div className="px-4 py-2 border-t border-slate-800/40 bg-slate-900/40 space-y-1.5">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-indigo-400" />
              Suggested Queries
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(preset)}
                  disabled={isLoading}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 bg-slate-900 border-t border-slate-800/80 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about deposits, bounces, repay capacity..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors cursor-pointer flex items-center justify-center shadow-lg hover:shadow-indigo-500/10"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
