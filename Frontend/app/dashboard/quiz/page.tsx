"use client"

import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, Brain, Zap, Trophy, ArrowRight, CheckCircle2, XCircle } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

type QuizQuestion = {
  question: string
  options: string[]
  correct_answer: string
}

type QuizResult = {
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

export default function QuizPage() {
  const router = useRouter()
  const [stage, setStage] = useState<"config" | "quiz" | "results">("config")

  // Configuration state
  const [topic, setTopic] = useState("")
  const [numQuestions, setNumQuestions] = useState([5])
  const [difficulty, setDifficulty] = useState("medium")
  const [loading, setLoading] = useState(false)

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [results, setResults] = useState<QuizResult[]>([])

  const handleGenerateQuiz = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: localStorage.getItem("studentId") || "guest-user",
          topic,
          numQuestions: numQuestions[0],
          difficulty,
        }),
      })

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text()
        console.error("[Quiz] Server error:", errorText)
        throw new Error(errorText)
      }

      const data = await response.json()
      // Backend returns { success: true, data: questions } OR { questions: [...] }
      const questions = data.data || data.questions || []
      setQuestions(questions)
      setStage("quiz")
    } catch (error) {
      console.error("[v0] Quiz generation error:", error)
      // Demo questions fallback
      const demoQuestions: QuizQuestion[] = [
        {
          question: "What is the capital of France?",
          options: ["London", "Berlin", "Paris", "Madrid"],
          correct_answer: "Paris",
        },
        {
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correct_answer: "4",
        },
        {
          question: "Which planet is known as the Red Planet?",
          options: ["Venus", "Mars", "Jupiter", "Saturn"],
          correct_answer: "Mars",
        },
      ]
      setQuestions(demoQuestions.slice(0, numQuestions[0]))
      setStage("quiz")
    } finally {
      setLoading(false)
    }
  }

  const handleNextQuestion = () => {
    if (!selectedAnswer) return

    const currentQ = questions[currentQuestion]
    setResults([
      ...results,
      {
        question: currentQ.question,
        userAnswer: selectedAnswer,
        correctAnswer: currentQ.correct_answer,
        isCorrect: selectedAnswer === currentQ.correct_answer,
      },
    ])

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer("")
    } else {
      setStage("results")
    }
  }

  const calculateScore = () => {
    const correct = results.filter((r) => r.isCorrect).length
    return Math.round((correct / results.length) * 100)
  }

  if (stage === "config") {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Generate Quiz</h1>
          <p className="text-gray-400 text-lg">Configure your personalized AI-generated quiz</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 shadow-2xl space-y-6"
        >
          {/* Topic Input */}
          <div className="space-y-3">
            <Label htmlFor="topic" className="text-lg font-semibold text-white">
              Topic
            </Label>
            <Input
              id="topic"
              type="text"
              placeholder="e.g., Mathematics, Physics, History"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-white/5 border-purple-500/20 text-white placeholder:text-gray-500 text-lg py-6"
            />
          </div>

          {/* Number of Questions */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-white">Number of Questions: {numQuestions[0]}</Label>
            <Slider value={numQuestions} onValueChange={setNumQuestions} min={1} max={20} step={1} className="py-4" />
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-white">Difficulty Level</Label>
            <RadioGroup value={difficulty} onValueChange={setDifficulty} className="flex gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                <RadioGroupItem value="easy" id="easy" className="peer sr-only" />
                <Label
                  htmlFor="easy"
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-purple-500/20 bg-white/5 p-4 cursor-pointer hover:bg-white/10 transition-all peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-gradient-to-br peer-data-[state=checked]:from-purple-600/20 peer-data-[state=checked]:to-blue-500/20"
                >
                  <Brain className="w-6 h-6 text-green-500" />
                  <span className="text-white font-medium">Easy</span>
                </Label>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                <RadioGroupItem value="medium" id="medium" className="peer sr-only" />
                <Label
                  htmlFor="medium"
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-purple-500/20 bg-white/5 p-4 cursor-pointer hover:bg-white/10 transition-all peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-gradient-to-br peer-data-[state=checked]:from-purple-600/20 peer-data-[state=checked]:to-blue-500/20"
                >
                  <Zap className="w-6 h-6 text-yellow-500" />
                  <span className="text-white font-medium">Medium</span>
                </Label>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                <RadioGroupItem value="hard" id="hard" className="peer sr-only" />
                <Label
                  htmlFor="hard"
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-purple-500/20 bg-white/5 p-4 cursor-pointer hover:bg-white/10 transition-all peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-gradient-to-br peer-data-[state=checked]:from-purple-600/20 peer-data-[state=checked]:to-blue-500/20"
                >
                  <Trophy className="w-6 h-6 text-red-500" />
                  <span className="text-white font-medium">Hard</span>
                </Label>
              </motion.div>
            </RadioGroup>
          </div>

          <Button
            onClick={handleGenerateQuiz}
            disabled={!topic || loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 text-lg py-6"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <BookOpen className="w-5 h-5" />
              </motion.div>
            ) : (
              <>
                Generate Quiz
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </motion.div>
      </div>
    )
  }

  if (stage === "quiz" && questions.length > 0) {
    const currentQ = questions[currentQuestion]
    const progress = ((currentQuestion + 1) / questions.length) * 100

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Progress Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-gray-400">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-balance">{currentQ.question}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQ.options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedAnswer(option)}
                  className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ${selectedAnswer === option
                    ? "bg-gradient-to-r from-purple-600 to-blue-500 border-2 border-purple-500 shadow-lg shadow-purple-500/50"
                    : "bg-white/5 border-2 border-purple-500/20 hover:border-purple-500/40 hover:bg-white/10"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${selectedAnswer === option ? "bg-white/20 text-white" : "bg-purple-500/20 text-purple-300"
                        }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-white font-medium">{option}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button
              onClick={handleNextQuestion}
              disabled={!selectedAnswer}
              className="w-full mt-8 bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 text-lg py-6"
            >
              {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Quiz"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  if (stage === "results") {
    const score = calculateScore()

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl p-8 shadow-2xl shadow-purple-500/50 text-center"
        >
          <Trophy className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Quiz Complete!</h1>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="text-7xl font-bold text-white my-6"
          >
            {score}%
          </motion.div>
          <p className="text-xl text-purple-100">
            You got {results.filter((r) => r.isCorrect).length} out of {results.length} correct
          </p>
        </motion.div>

        {/* Results List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Review Your Answers</h2>
          {results.map((result, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white/5 backdrop-blur-xl border rounded-2xl p-6 shadow-2xl ${result.isCorrect ? "border-green-500/30" : "border-red-500/30"
                }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${result.isCorrect ? "bg-green-500/20" : "bg-red-500/20"
                    }`}
                >
                  {result.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{result.question}</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-400">
                      Your answer:{" "}
                      <span className={result.isCorrect ? "text-green-400" : "text-red-400"}>{result.userAnswer}</span>
                    </p>
                    {!result.isCorrect && (
                      <p className="text-gray-400">
                        Correct answer: <span className="text-green-400">{result.correctAnswer}</span>
                      </p>
                    )}
                  </div>
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
            View My Roadmap
          </Button>
          <Button
            onClick={() => {
              setStage("config")
              setCurrentQuestion(0)
              setSelectedAnswer("")
              setResults([])
              setQuestions([])
            }}
            variant="outline"
            className="border-purple-500/20 hover:bg-white/5 text-white text-lg py-6"
          >
            Try Another Quiz
          </Button>
        </div>
      </div>
    )
  }

  return null
}
