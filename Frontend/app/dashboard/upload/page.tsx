"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { Upload, X, CheckCircle2, FileText } from "lucide-react"
import { motion } from "framer-motion"
import pdfToText from "react-pdftotext"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState("")
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [docId, setDocId] = useState("")

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [Upload] File selected:`, file.name, `(${file.size} bytes)`);
      setFile(file)
      handleUpload(file)
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
    const uploadStartTime = Date.now();
    const startTimestamp = new Date().toISOString();
    console.log(`[${startTimestamp}] ========== UPLOAD STARTED ==========`);
    console.log(`[${startTimestamp}] [Upload] Processing PDF:`, fileToUpload.name);

    setUploading(true)
    setUploadProgress(0)
    setUploadStatus("Preparing upload...")

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 70) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + 10
      })
    }, 200)

    try {
      setUploadProgress(10)
      setUploadStatus("Extracting PDF text...")

      // Extract text from PDF using react-pdftotext
      const extractStartTime = Date.now();
      console.log(`[${new Date().toISOString()}] [Upload] Starting PDF text extraction...`);
      const extractedText = await pdfToText(fileToUpload)
      const extractEndTime = Date.now();

      console.log(`[${new Date().toISOString()}] [Upload] Extraction complete in ${(extractEndTime - extractStartTime) / 1000}s, text length: ${extractedText.length} chars`);

      setUploadProgress(30)
      setUploadStatus("Starting chunked upload...")

      // Prepare chunked upload
      const CHUNK_SIZE = 10000;
      const totalChunks = Math.ceil(extractedText.length / CHUNK_SIZE);
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      console.log(`[${new Date().toISOString()}] [Upload] Split into ${totalChunks} chunks (Total: ${extractedText.length} chars)`);

      let uploadData = null;

      // Send chunks sequentially
      for (let i = 0; i < totalChunks; i++) {
        const chunk = extractedText.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

        const chunkPayload = {
          requestId,
          fileName: fileToUpload.name,
          studentId: localStorage.getItem("studentId") || "guest-user",
          chunk,
          chunkIndex: i,
          totalChunks
        };

        setUploadStatus(`Uploading chunk ${i + 1}/${totalChunks}...`);

        const response = await fetch("/api/upload-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunkPayload),
        });

        if (!response.ok) {
          throw new Error(`Upload failed at chunk ${i + 1}: ${response.status}`);
        }

        // Update progress (30% to 90%)
        const chunkProgress = 30 + Math.round(((i + 1) / totalChunks) * 60);
        setUploadProgress(chunkProgress);

        // Last chunk returns the final response
        if (i === totalChunks - 1) {
          uploadData = await response.json();
        }
      }

      setUploadStatus("Processing PDF in background...")

      console.log(`[${new Date().toISOString()}] [Upload] Upload accepted! RequestId: ${uploadData.requestId}`);
      console.log(`[${new Date().toISOString()}] [Upload] Starting to poll for completion...`);

      // Start polling for completion
      const pollResult = await pollForCompletion(uploadData.requestId, uploadStartTime);

      const successTimestamp = new Date().toISOString();
      const totalDuration = (Date.now() - uploadStartTime) / 1000;
      console.log(`[${successTimestamp}] [Upload] ✅ SUCCESS! Total time: ${totalDuration}s`);
      console.log(`[${successTimestamp}] [Upload] Final data:`, pollResult);

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (pollResult.success && pollResult.suggestedTopics) {
        setSuggestedTopics(pollResult.suggestedTopics)
        setDocId(pollResult.docId || uploadData.requestId)
        setSelectedTopics(pollResult.suggestedTopics)
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error) {
      const errorTimestamp = new Date().toISOString();
      console.log(`[${errorTimestamp}] [Upload] Error:`, error)

      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: (error as Error).message || "Failed to upload PDF. Please try again."
      })

      setUploadStatus("Upload failed")
    } finally {
      clearInterval(progressInterval)
      setUploading(false)
    }
  }

  const pollForCompletion = async (requestId: string, startTime: number): Promise<any> => {
    const maxAttempts = 60  // Poll for up to 2 minutes
    let attempts = 0

    while (attempts < maxAttempts) {
      const pollTimestamp = new Date().toISOString();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`[${pollTimestamp}] [Upload] Poll attempt ${attempts + 1}/${maxAttempts} (${elapsed}s elapsed)`);

      setUploadStatus(`Processing PDF... (${elapsed}s)`);

      try {
        const statusRes = await fetch(`/api/upload-status?requestId=${requestId}`)
        const statusData = await statusRes.json()

        console.log(`[${new Date().toISOString()}] [Upload] Status: ${statusData.status}`);

        if (statusData.status === "complete") {
          console.log(`[${new Date().toISOString()}] [Upload] ✅ Processing complete!`);
          setUploadStatus("Processing complete!");

          toast({
            title: "Success!",
            description: "PDF processed successfully"
          })

          return statusData
        }

        if (statusData.status === "error") {
          throw new Error(statusData.message || "Processing failed")
        }

        // Update progress based on elapsed time
        const estimatedProgress = Math.min(70 + (attempts * 2), 95);
        setUploadProgress(estimatedProgress);

        // Wait 2 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 2000))
        attempts++
      } catch (error) {
        console.log(`[${new Date().toISOString()}] [Upload] Poll error:`, error);
        throw error;
      }
    }

    throw new Error("Processing timeout - please try again")
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

          {uploading ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary text-white" />
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">{uploadStatus}</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadProgress}% complete
                  </p>
                </div>
                <Progress value={uploadProgress} className="w-full max-w-md" />
              </div>
            </div>
          ) : suggestedTopics.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-green-500"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Upload complete!</span>
            </motion.div>
          ) : null}
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
