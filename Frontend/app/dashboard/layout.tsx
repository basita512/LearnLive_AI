"use client"

import type React from "react"

import { motion } from "framer-motion"
import { BookOpen, FileUp, MessageSquare, Mic, TrendingUp, GraduationCap } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [studentName, setStudentName] = useState("")

  useEffect(() => {
    const name = localStorage.getItem("studentName")
    if (name) {
      setStudentName(name)
    }
  }, [])

  const navItems = [
    { href: "/dashboard/upload", icon: FileUp, label: "Upload PDFs" },
    { href: "/dashboard/quiz", icon: BookOpen, label: "Generate Quiz" },
    { href: "/dashboard/oral-test", icon: Mic, label: "Oral Test" },
    { href: "/dashboard/chat", icon: MessageSquare, label: "AI Chat" },
    { href: "/dashboard/roadmap", icon: TrendingUp, label: "My Roadmap" },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72">
        <div className="flex h-full flex-col gap-y-6 bg-white/5 backdrop-blur-xl border-r border-purple-500/20 px-6 py-8">
          {/* Logo and Student Name */}
          <div>
            <Link href="/dashboard" className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">LearnLive AI</span>
            </Link>
            {studentName && <p className="text-sm text-gray-400 ml-12">Hi, {studentName}!</p>}
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col gap-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/50"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.div>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-xl border-t border-purple-500/20">
        <div className="flex items-center justify-around px-4 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? "text-purple-500" : "text-gray-400"
                  }`}
                >
                  <item.icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:pl-72">
        <div className="px-4 py-8 sm:px-6 lg:px-8 pb-24 lg:pb-8">{children}</div>
      </main>
    </div>
  )
}
