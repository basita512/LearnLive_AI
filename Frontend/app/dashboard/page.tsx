"use client"

import { motion } from "framer-motion"
import { BookOpen, FileUp, Mic, TrendingUp, Award } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function DashboardPage() {
  const [studentName, setStudentName] = useState("")

  useEffect(() => {
    const name = localStorage.getItem("studentName")
    if (name) {
      setStudentName(name)
    }
  }, [])

  const stats = [
    { label: "Quizzes Taken", value: "12", icon: BookOpen },
    { label: "Average Score", value: "85%", icon: Award },
    { label: "Oral Tests", value: "8", icon: Mic },
    { label: "Topics Mastered", value: "15", icon: TrendingUp },
  ]

  const quickActions = [
    {
      title: "Upload New PDF",
      description: "Upload study materials to generate quizzes",
      icon: FileUp,
      href: "/dashboard/upload",
      gradient: "from-purple-600 to-blue-500",
    },
    {
      title: "Take Quiz",
      description: "Start a new AI-generated quiz",
      icon: BookOpen,
      href: "/dashboard/quiz",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Practice Oral",
      description: "Practice speaking with AI evaluation",
      icon: Mic,
      href: "/dashboard/oral-test",
      gradient: "from-cyan-500 to-teal-500",
    },
    {
      title: "View Progress",
      description: "Check your learning roadmap",
      icon: TrendingUp,
      href: "/dashboard/roadmap",
      gradient: "from-teal-500 to-green-500",
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl p-8 shadow-2xl shadow-purple-500/30"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Hi {studentName || "there"}! Ready to learn?</h1>
        <p className="text-purple-100 text-lg">Let's continue your learning journey today</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50">
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 group"
              >
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <action.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{action.title}</h3>
                <p className="text-gray-400">{action.description}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
