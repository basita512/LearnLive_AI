"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface NameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NameModal({ open, onOpenChange }: NameModalProps) {
  const [name, setName] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      const studentId = name.toLowerCase().replace(/\s/g, "-")
      localStorage.setItem("studentId", studentId)
      localStorage.setItem("studentName", name.trim())
      onOpenChange(false)
      router.push("/dashboard")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#11111b]/95 backdrop-blur-xl border-purple-500/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Welcome to LearnLive AI</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter your name to get started with personalized learning
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border-purple-500/20 text-white placeholder:text-gray-500 focus:border-purple-500/50"
            autoFocus
          />
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
            disabled={!name.trim()}
          >
            Continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
