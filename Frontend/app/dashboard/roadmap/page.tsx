"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Target, Award, BookOpen, Lightbulb, CheckCircle2, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export default function RoadmapPage() {
  const [analytics, setAnalytics] = useState({
    totalTests: 20,
    averageScore: 85,
    trend: "up",
    status: "Excellent",
    quizCount: 12,
    oralTestCount: 8,
  })

  const [weakTopics] = useState([
    { name: "Quantum Physics", score: 65, progress: 65 },
    { name: "Organic Chemistry", score: 70, progress: 70 },
    { name: "Calculus II", score: 72, progress: 72 },
  ])

  const [strongTopics] = useState([
    { name: "Linear Algebra", score: 95 },
    { name: "Data Structures", score: 92 },
    { name: "World History", score: 90 },
    { name: "English Literature", score: 88 },
  ])

  const [recentActivity] = useState([
    { type: "quiz", title: "Mathematics Quiz", score: 90, date: "2 hours ago" },
    { type: "oral", title: "Physics Oral Test", score: 85, date: "5 hours ago" },
    { type: "quiz", title: "Chemistry Quiz", score: 78, date: "1 day ago" },
    { type: "oral", title: "History Oral Test", score: 92, date: "2 days ago" },
    { type: "quiz", title: "Biology Quiz", score: 88, date: "3 days ago" },
  ])

  const [recommendations] = useState([
    {
      title: "Focus on Quantum Physics",
      description: "Your weakest area. Recommended: 3 more practice sessions",
      icon: Target,
    },
    {
      title: "Review Organic Chemistry",
      description: "Improve understanding of reaction mechanisms",
      icon: BookOpen,
    },
    {
      title: "Practice Calculus Problems",
      description: "Work on integration techniques and applications",
      icon: Lightbulb,
    },
  ])

  useEffect(() => {
    // Fetch roadmap data from API
    const fetchRoadmap = async () => {
      try {
        const response = await fetch("/api/get-roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: localStorage.getItem("studentId") || "",
          }),
        })
        const data = await response.json()
        if (data.analytics) {
          setAnalytics(data.analytics)
        }
      } catch (error) {
        console.error("[v0] Roadmap fetch error:", error)
        // Using demo data as fallback
      }
    }

    fetchRoadmap()
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Learning Roadmap</h1>
        <p className="text-gray-400 text-lg">Track your progress and get personalized recommendations</p>
      </motion.div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-400">Total Tests</h3>
            <BookOpen className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-4xl font-bold text-white">{analytics.totalTests}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
            <span>Quizzes: {analytics.quizCount}</span>
            <span>•</span>
            <span>Oral: {analytics.oralTestCount}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-400">Average Score</h3>
            {analytics.trend === "up" ? (
              <TrendingUp className="w-6 h-6 text-green-500" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-500" />
            )}
          </div>
          <p className="text-4xl font-bold text-white">{analytics.averageScore}%</p>
          <div className="mt-4">
            <Badge
              className={`${analytics.trend === "up" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}
            >
              {analytics.trend === "up" ? "↑" : "↓"} Trending {analytics.trend}
            </Badge>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-600/20 to-blue-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-400">Performance</h3>
            <Award className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-4xl font-bold text-white">{analytics.status}</p>
          <p className="mt-4 text-sm text-gray-400">Keep up the great work!</p>
        </motion.div>
      </div>

      {/* Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl p-8 shadow-2xl shadow-purple-500/30"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">Recommended Focus Area</h2>
            <p className="text-purple-100 text-lg mb-4">
              Based on your recent performance, we recommend focusing on Quantum Physics. You've shown improvement, but
              there's still room to grow in this area.
            </p>
            <Button className="bg-white/20 hover:bg-white/30 text-white border-0">Start Practice Session</Button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Weak Topics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-white">Topics to Improve</h2>
          <div className="space-y-4">
            {weakTopics.map((topic, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{topic.name}</h3>
                  <span className="text-2xl font-bold text-yellow-500">{topic.score}</span>
                </div>
                <Progress value={topic.progress} className="h-2 mb-3" />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-500/20 hover:bg-white/5 text-gray-300 hover:text-white bg-transparent"
                >
                  Review Material
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Strong Topics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-white">Mastered Topics</h2>
          <div className="space-y-4">
            {strongTopics.map((topic, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-green-500/20 rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{topic.name}</h3>
                      <Badge className="bg-green-500/20 text-green-400 mt-1">Mastered</Badge>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-500">{topic.score}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Suggested Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <h2 className="text-2xl font-bold text-white mb-6">Suggested Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendations.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/50">
                <rec.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{rec.title}</h3>
              <p className="text-gray-400 mb-4">{rec.description}</p>
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
              >
                Take Action
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl">
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.05 }}
                className="flex items-center gap-4 pb-4 border-b border-purple-500/10 last:border-0 last:pb-0"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${activity.type === "quiz" ? "bg-purple-500/20" : "bg-blue-500/20"
                    }`}
                >
                  {activity.type === "quiz" ? (
                    <BookOpen className="w-6 h-6 text-purple-400" />
                  ) : (
                    <Lightbulb className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">{activity.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                    <Clock className="w-4 h-4" />
                    <span>{activity.date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-bold ${activity.score >= 90
                        ? "text-green-500"
                        : activity.score >= 75
                          ? "text-yellow-500"
                          : "text-red-500"
                      }`}
                  >
                    {activity.score}
                  </div>
                  <div className="text-xs text-gray-400">Score</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
