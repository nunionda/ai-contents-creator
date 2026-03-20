"use client"

import { useEffect, useCallback } from "react"
import { API_BASE } from "../lib/api"

export interface Asset {
  id: string
  type: string
  phase: string
  agent_name: string
  scene_number: number | null
  file_path: string
  file_name: string
  mime_type: string
  file_size: number | null
  created_at: string
}

export interface AssetLightboxProps {
  assets: Asset[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  IMAGE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  VIDEO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  AUDIO: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  MODEL_3D: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  DOCUMENT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-20 w-20 text-gray-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}

function AudioWaveform() {
  const bars = [4, 8, 6, 12, 10, 7, 14, 9, 5, 11, 8, 13, 6, 10, 7, 12, 9, 5, 11, 8]
  return (
    <div className="flex items-center gap-1 h-16">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-2 rounded-full bg-amber-400/60"
          style={{ height: `${height * 4}px` }}
        />
      ))}
    </div>
  )
}

function MediaContent({ asset }: { asset: Asset }) {
  const downloadUrl = `${API_BASE}/api/assets/download/${asset.id}`

  if (asset.type === "IMAGE") {
    return (
      <img
        src={downloadUrl}
        alt={asset.file_name}
        className="max-h-[70vh] w-auto object-contain rounded-lg"
      />
    )
  }

  if (asset.type === "VIDEO") {
    return (
      <video
        controls
        autoPlay
        className="max-h-[70vh] w-auto rounded-lg"
        key={asset.id}
      >
        <source src={downloadUrl} type={asset.mime_type} />
        Your browser does not support the video tag.
      </video>
    )
  }

  if (asset.type === "AUDIO") {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <AudioWaveform />
        <audio controls key={asset.id} className="w-full max-w-md">
          <source src={downloadUrl} type={asset.mime_type} />
          Your browser does not support the audio tag.
        </audio>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <FileIcon />
      <span className="text-gray-400 text-sm font-medium uppercase tracking-widest">
        {asset.type.replace(/_/g, " ")}
      </span>
    </div>
  )
}

export function AssetLightbox({
  assets,
  currentIndex,
  onClose,
  onNavigate,
}: AssetLightboxProps) {
  const asset = assets[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < assets.length - 1

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1)
  }, [hasPrev, currentIndex, onNavigate])

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1)
  }, [hasNext, currentIndex, onNavigate])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft") handlePrev()
      else if (e.key === "ArrowRight") handleNext()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, handlePrev, handleNext])

  if (!asset) return null

  const badgeColor =
    TYPE_BADGE_COLORS[asset.type] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"
  const downloadUrl = `${API_BASE}/api/assets/download/${asset.id}`
  const fileSize = formatFileSize(asset.file_size)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Main panel */}
      <div
        className="relative flex flex-col w-full max-w-5xl mx-4 rounded-2xl border border-gray-800 bg-gray-900/80 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${badgeColor}`}
          >
            {asset.type.replace(/_/g, " ")}
          </span>
          <h2 className="flex-1 truncate text-sm font-medium text-gray-200">
            {asset.file_name}
          </h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {asset.scene_number !== null && (
              <span>Scene {asset.scene_number}</span>
            )}
            {asset.agent_name && (
              <span className="hidden sm:inline">{asset.agent_name}</span>
            )}
            {fileSize && <span>{fileSize}</span>}
          </div>
          <a
            href={downloadUrl}
            download={asset.file_name}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/20 transition-colors"
            title="Download"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Download</span>
          </a>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Media area */}
        <div className="relative flex items-center justify-center min-h-[200px] px-16 py-6">
          <MediaContent asset={asset} />

          {/* Left arrow */}
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-black/50 text-gray-300 border border-gray-700 hover:bg-black/70 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            aria-label="Previous asset"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Right arrow */}
          <button
            onClick={handleNext}
            disabled={!hasNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-black/50 text-gray-300 border border-gray-700 hover:bg-black/70 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            aria-label="Next asset"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Footer: position indicator */}
        {assets.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 px-5 py-3 border-t border-gray-800">
            {assets.map((_, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex
                    ? "w-5 bg-gray-300"
                    : "w-1.5 bg-gray-700 hover:bg-gray-500"
                }`}
                aria-label={`Go to asset ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
