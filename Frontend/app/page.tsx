"use client"

import { motion } from "framer-motion"
import { ArrowRight, BookOpen, MessageSquare, Mic, TrendingUp } from "lucide-react"
import { useState } from "react"
import { NameModal } from "@/components/NameModal"

export default function LandingPage() {
  const [showNameModal, setShowNameModal] = useState(false)

  const features = [
    {
      icon: BookOpen,
      title: "AI Quiz Generation",
      description: "Generate quizzes from your PDFs instantly with advanced AI technology",
    },
    {
      icon: Mic,
      title: "Oral Test Evaluation",
      description: "Practice speaking with AI and get instant feedback on your responses",
    },
    {
      icon: MessageSquare,
      title: "24/7 AI Tutor",
      description: "Ask questions anytime and get personalized answers from your AI tutor",
    },
    {
      icon: TrendingUp,
      title: "Learning Analytics",
      description: "Track your progress and get personalized learning roadmaps",
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-radial from-purple-600/20 via-blue-500/10 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-5xl mx-auto"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 text-balance"
          >
            Master Learning with{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-400 mb-12 text-pretty max-w-3xl mx-auto"
          >
            Personalized quizzes, oral tests, and real-time AI tutoring to transform your learning experience
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNameModal(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70 transition-all duration-300 inline-flex items-center gap-2 text-lg"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-400">Everything you need to excel in your studies</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/50">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-12 shadow-2xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to transform your learning?</h2>
          <p className="text-xl text-gray-400 mb-8">Join thousands of students already using AI to ace their studies</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNameModal(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70 transition-all duration-300 inline-flex items-center gap-2 text-lg"
          >
            Start Learning Now
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </section>

      <NameModal open={showNameModal} onOpenChange={setShowNameModal} />
    </div>
  )
}
