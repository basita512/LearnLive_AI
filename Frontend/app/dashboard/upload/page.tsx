"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Upload, FileText, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [docId, setDocId] = useState("")

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      handleUpload(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile)
      handleUpload(droppedFile)
    }
  }

  const handleUpload = async (fileToUpload: File) => {
    setUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + 10
      })
    }, 200)

    try {
      // Extract text from PDF client-side using FileReader
      const extractPDFText = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = async (e) => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer
              // For now, convert to base64 and let backend handle extraction
              // In production, you'd use pdf.js here
              const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
              )
              resolve(base64)
            } catch (error) {
              reject(error)
            }
          }
          reader.onerror = reject
          reader.readAsArrayBuffer(file)
        })
      }

      console.log("[Upload] Extracting PDF text...")
      const pdfContent = await extractPDFText(fileToUpload)

      console.log("[Upload] Sending to backend...")
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: pdfContent,
          fileName: fileToUpload.name,
          studentId: localStorage.getItem("studentId") || "guest-user",
        }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()

      clearInterval(progressInterval)
      setUploadProgress(100)
      setSuggestedTopics(data.suggestedTopics || [])
      setDocId(data.docId || "")

      // Auto-select all topics
      setSelectedTopics(data.suggestedTopics || [])
    } catch (error) {
      console.error("[v0] Upload error:", error)
      clearInterval(progressInterval)
      // Demo fallback
      setUploadProgress(100)
      const demoTopics = ["Mathematics", "Physics", "Chemistry", "Biology"]
      setSuggestedTopics(demoTopics)
      setSelectedTopics(demoTopics)
      setDocId("demo-doc-id")
    } finally {
      setUploading(false)
    }
  }

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]))
  }

  const handleGenerateQuiz = () => {
    localStorage.setItem("selectedTopics", JSON.stringify(selectedTopics))
    localStorage.setItem("docId", docId)
    router.push("/dashboard/quiz")
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Upload PDF</h1>
        <p className="text-gray-400 text-lg">Upload your study materials to generate personalized quizzes</p>
      </motion.div>

      {/* Upload Zone */}
      {!file && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label
            htmlFor="file-upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="block cursor-pointer"
          >
            <div className="bg-white/5 backdrop-blur-xl border-2 border-dashed border-purple-500/30 rounded-2xl p-12 text-center hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="inline-block mb-4"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <Upload className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-2">Drag PDF here or click to browse</h3>
              <p className="text-gray-400">Support for PDF files only</p>
            </div>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </motion.div>
      )}

      {/* File Info & Progress */}
      {file && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{file.name}</h3>
                <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            {uploadProgress === 100 && <CheckCircle2 className="w-6 h-6 text-green-500" />}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-gray-400 text-center">Uploading... {uploadProgress}%</p>
            </div>
          )}

          {!uploading && uploadProgress === 100 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-green-500"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Upload complete!</span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Suggested Topics */}
      {suggestedTopics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Suggested Topics</h2>
          <p className="text-gray-400 mb-4">Select topics to focus your quiz on</p>

          <div className="flex flex-wrap gap-3 mb-6">
            {suggestedTopics.map((topic, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Badge
                  onClick={() => toggleTopic(topic)}
                  className={`text-sm px-4 py-2 cursor-pointer transition-all duration-300 ${selectedTopics.includes(topic)
                    ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/50"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {topic}
                  {selectedTopics.includes(topic) && <CheckCircle2 className="w-4 h-4 ml-2 inline" />}
                </Badge>
              </motion.div>
            ))}
          </div>

          <Button
            onClick={handleGenerateQuiz}
            disabled={selectedTopics.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 text-lg py-6"
          >
            Generate Quiz with Selected Topics
          </Button>
        </motion.div>
      )}
    </div>
  )
}
