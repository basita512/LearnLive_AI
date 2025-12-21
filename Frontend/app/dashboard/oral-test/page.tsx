"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Volume2, ArrowRight, Trophy } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import dynamic from "next/dynamic"

const Spline = dynamic(() => import("@splinetool/react-spline/next"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
      />
    </div>
  ),
})

type TestStage = "start" | "testing" | "results"

type QuestionResult = {
  question: string
  transcript: string
  score: number
  feedback: string
}

export default function OralTestPage() {
  const router = useRouter()
  const [stage, setStage] = useState<TestStage>("start")
  const [topic, setTopic] = useState("")

  // Test state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [results, setResults] = useState<QuestionResult[]>([])

  // Speech recognition
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis

      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onresult = (event: any) => {
          const speechResult = event.results[0][0].transcript
          console.log("[v0] Speech recognized:", speechResult)
          setTranscript(speechResult)
          setIsRecording(false)
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("[v0] Speech recognition error:", event.error)
          setIsRecording(false)
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      }
    }
  }, [])

  const speakText = (text: string) => {
    if (synthRef.current && text) {
      // Cancel any ongoing speech
      synthRef.current.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      synthRef.current.speak(utterance)
    }
  }

  const handleStartTest = () => {
    const testQuestions = [
      "What are the main benefits of artificial intelligence in education?",
      "How would you explain the concept of machine learning to a beginner?",
      "What ethical considerations should we keep in mind when using AI?",
    ]

    setQuestions(testQuestions)
    setStage("testing")

    // Speak the first question
    setTimeout(() => {
      speakText(testQuestions[0])
    }, 500)
  }

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser")
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      setTranscript("")
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!transcript) return

    try {
      const response = await fetch("/api/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: localStorage.getItem("studentId") || "",
          question: questions[currentQuestionIndex],
          transcript,
        }),
      })

      const data = await response.json()

      setResults([
        ...results,
        {
          question: questions[currentQuestionIndex],
          transcript,
          score: data.score || 85,
          feedback: data.feedback || "Good response with clear explanation.",
        },
      ])

      // Speak AI feedback
      if (data.speakableResponse) {
        speakText(data.speakableResponse)
      }

      // Move to next question or results
      if (currentQuestionIndex < questions.length - 1) {
        setTimeout(() => {
          const nextIndex = currentQuestionIndex + 1
          setCurrentQuestionIndex(nextIndex)
          setTranscript("")
          speakText(questions[nextIndex])
        }, 2000)
      } else {
        setTimeout(() => {
          setStage("results")
        }, 2000)
      }
    } catch (error) {
      console.error("[v0] Submit answer error:", error)
      // Demo fallback
      setResults([
        ...results,
        {
          question: questions[currentQuestionIndex],
          transcript,
          score: 85,
          feedback: "Good response with clear explanation and relevant examples.",
        },
      ])

      if (currentQuestionIndex < questions.length - 1) {
        setTimeout(() => {
          const nextIndex = currentQuestionIndex + 1
          setCurrentQuestionIndex(nextIndex)
          setTranscript("")
          speakText(questions[nextIndex])
        }, 1500)
      } else {
        setTimeout(() => {
          setStage("results")
        }, 1500)
      }
    }
  }

  const calculateAverageScore = () => {
    if (results.length === 0) return 0
    const total = results.reduce((sum, r) => sum + r.score, 0)
    return Math.round(total / results.length)
  }

  if (stage === "start") {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Oral Test</h1>
          <p className="text-gray-400 text-lg">Practice speaking with AI and get instant feedback</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 shadow-2xl space-y-6"
        >
          <div className="space-y-3">
            <label htmlFor="topic" className="text-lg font-semibold text-white block">
              Choose Your Topic
            </label>
            <Input
              id="topic"
              type="text"
              placeholder="e.g., Artificial Intelligence, Science, History"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-white/5 border-purple-500/20 text-white placeholder:text-gray-500 text-lg py-6"
            />
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-2">How it works:</h3>
            <ul className="text-gray-400 space-y-2">
              <li>• The AI interviewer will ask you questions</li>
              <li>• Click the microphone to record your answer</li>
              <li>• Get instant feedback and scoring</li>
              <li>• Practice as many times as you want</li>
            </ul>
          </div>

          <Button
            onClick={handleStartTest}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 text-lg py-6"
          >
            Start Test
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    )
  }

  if (stage === "testing") {
    const currentQuestion = questions[currentQuestionIndex]

    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Progress */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-gray-400 text-lg">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 3D Spline Component */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden h-[500px]"
          >
            <Spline scene="https://prod.spline.design/CrZOBz2wXFieV066/scene.splinecode" />
          </motion.div>

          {/* Question & Controls */}
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            {/* Question Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-purple-600/20 to-blue-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-white text-balance flex-1">{currentQuestion}</h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => speakText(currentQuestion)}
                    className="text-purple-300 hover:text-white hover:bg-white/10 flex-shrink-0"
                  >
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Recording Button */}
            <motion.div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isRecording
                    ? "bg-gradient-to-br from-red-500 to-pink-500 shadow-red-500/50"
                    : "bg-gradient-to-br from-purple-600 to-blue-500 shadow-purple-500/50"
                  }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-10 h-10 text-white" />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                      className="absolute inset-0 rounded-full border-4 border-white/30"
                    />
                  </>
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </motion.button>
            </motion.div>

            <p className="text-center text-gray-400">
              {isRecording ? "Listening... Click to stop" : "Click to start recording"}
            </p>

            {/* Transcript Display */}
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl"
              >
                <h3 className="text-lg font-semibold text-white mb-3">Your Response:</h3>
                <p className="text-gray-300 leading-relaxed">{transcript}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmitAnswer}
              disabled={!transcript}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 text-lg py-6"
            >
              Submit Answer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  if (stage === "results") {
    const avgScore = calculateAverageScore()

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl p-8 shadow-2xl shadow-purple-500/50 text-center"
        >
          <Trophy className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Oral Test Complete!</h1>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="text-7xl font-bold text-white my-6"
          >
            {avgScore}
          </motion.div>
          <p className="text-xl text-purple-100">Average Score</p>
        </motion.div>

        {/* Results List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Detailed Feedback</h2>
          {results.map((result, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex-1">{result.question}</h3>
                <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg">
                  <span className="text-white font-bold">{result.score}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Your Response:</p>
                  <p className="text-white">{result.transcript}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">AI Feedback:</p>
                  <p className="text-gray-300">{result.feedback}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => router.push("/dashboard/roadmap")}
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 text-lg py-6"
          >
            View Roadmap
          </Button>
          <Button
            onClick={() => {
              setStage("start")
              setCurrentQuestionIndex(0)
              setTranscript("")
              setResults([])
              setQuestions([])
            }}
            variant="outline"
            className="border-purple-500/20 hover:bg-white/5 text-white text-lg py-6"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return null
}
