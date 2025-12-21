"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Send, Trash2, Bot, User } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const suggestedQuestions = [
    "Explain the theory of relativity",
    "How does photosynthesis work?",
    "What are the key features of React?",
    "Explain machine learning basics",
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages([...messages, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: localStorage.getItem("studentId") || "",
          message: input,
        }),
      })

      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let aiResponse = ""

        const assistantMessage: Message = {
          role: "assistant",
          content: "",
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          aiResponse += chunk

          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...assistantMessage,
              content: aiResponse,
            }
            return updated
          })
        }
      }
    } catch (error) {
      console.error("[v0] Chat error:", error)
      // Demo fallback
      setTimeout(() => {
        const assistantMessage: Message = {
          role: "assistant",
          content:
            "I'm your AI tutor, here to help you learn! I can explain concepts, answer questions about your study materials, and provide guidance on any topic. What would you like to learn about today?",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }, 1000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">AI Chat</h1>
            <p className="text-gray-400 text-lg">Ask me anything about your study materials</p>
          </div>
          {messages.length > 0 && (
            <Button
              onClick={handleClearChat}
              variant="outline"
              size="sm"
              className="border-purple-500/20 hover:bg-white/5 text-gray-400 hover:text-white bg-transparent"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Chat
            </Button>
          )}
        </div>
      </motion.div>

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <p className="text-sm text-gray-400 mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Badge
                  onClick={() => handleSuggestedQuestion(question)}
                  className="cursor-pointer bg-white/5 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-500 text-gray-300 hover:text-white border border-purple-500/20 px-4 py-2 transition-all duration-300"
                >
                  {question}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-4 bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, x: message.role === "user" ? 50 : -50 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/50">
                  <Bot className="w-6 h-6 text-white" />
                </div>
              )}

              <div
                className={`max-w-[70%] rounded-2xl p-4 ${message.role === "user"
                    ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/30"
                    : "bg-white/5 text-gray-200 border border-purple-500/20"
                  }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-2 opacity-70">{message.timestamp.toLocaleTimeString()}</p>
              </div>

              {message.role === "user" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/50">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="bg-white/5 border border-purple-500/20 rounded-2xl px-6 py-4 flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.2 }}
                className="w-2 h-2 bg-purple-500 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.2, delay: 0.2 }}
                className="w-2 h-2 bg-purple-500 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.2, delay: 0.4 }}
                className="w-2 h-2 bg-purple-500 rounded-full"
              />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4 shadow-2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex gap-3"
        >
          <Input
            type="text"
            placeholder="Ask me anything about your materials..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-white/5 border-purple-500/20 text-white placeholder:text-gray-500 text-base py-6"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 px-6"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
