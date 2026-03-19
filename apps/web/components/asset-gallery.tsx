"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchAPI, API_BASE } from "../lib/api"

interface Asset {
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

type FilterType = "IMAGE" | "VIDEO" | "AUDIO" | "all"

interface AssetGalleryProps {
  projectId: string
  filter?: FilterType
}

const FILTER_TABS: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Images", value: "IMAGE" },
  { label: "Videos", value: "VIDEO" },
  { label: "Audio", value: "AUDIO" },
]

const TYPE_BADGE_COLORS: Record<string, string> = {
  IMAGE: "bg-purple-500/20 text-purple-400",
  VIDEO: "bg-blue-500/20 text-blue-400",
  AUDIO: "bg-amber-500/20 text-amber-400",
  MODEL_3D: "bg-emerald-500/20 text-emerald-400",
  DOCUMENT: "bg-gray-500/20 text-gray-400",
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-gray-800 bg-gray-900"
        >
          <div className="h-40 rounded-t-xl bg-gray-800" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 rounded bg-gray-800" />
            <div className="h-3 w-1/2 rounded bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AssetCard({ asset }: { asset: Asset }) {
  const badgeColor = TYPE_BADGE_COLORS[asset.type] ?? TYPE_BADGE_COLORS.DOCUMENT

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-colors hover:border-gray-700">
      {/* Media preview */}
      <div className="relative flex h-40 items-center justify-center bg-gray-950">
        {asset.type === "IMAGE" && (
          <img
            src={`${API_BASE}/api/assets/download/${asset.id}`}
            alt={asset.file_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
        {asset.type === "VIDEO" && (
          <video
            src={`${API_BASE}/api/assets/download/${asset.id}`}
            controls
            className="h-full w-full object-cover"
            preload="metadata"
          />
        )}
        {asset.type === "AUDIO" && (
          <div className="flex w-full flex-col items-center gap-3 px-4">
            {/* Waveform placeholder */}
            <div className="flex h-12 w-full items-end justify-center gap-0.5">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-amber-500/40"
                  style={{
                    height: `${Math.max(4, Math.sin(i * 0.5) * 24 + Math.random() * 16)}px`,
                  }}
                />
              ))}
            </div>
            <audio
              src={`${API_BASE}/api/assets/download/${asset.id}`}
              controls
              className="w-full"
              preload="metadata"
            />
          </div>
        )}
        {asset.type !== "IMAGE" &&
          asset.type !== "VIDEO" &&
          asset.type !== "AUDIO" && (
            <div className="flex flex-col items-center gap-2 text-gray-600">
              <svg
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-xs">{asset.type}</span>
            </div>
          )}
      </div>

      {/* Caption */}
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeColor}`}>
            {asset.type}
          </span>
          {asset.file_size !== null && (
            <span className="text-[10px] text-gray-600">
              {formatFileSize(asset.file_size)}
            </span>
          )}
        </div>
        <p className="truncate text-xs font-medium text-gray-300">
          {asset.file_name}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
          {asset.scene_number !== null && <span>Scene {asset.scene_number}</span>}
          {asset.scene_number !== null && asset.agent_name && (
            <span className="text-gray-700">/</span>
          )}
          {asset.agent_name && <span>{asset.agent_name}</span>}
        </div>
      </div>
    </div>
  )
}

export function AssetGallery({ projectId, filter: initialFilter = "all" }: AssetGalleryProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter)

  const fetchAssets = useCallback(() => {
    setLoading(true)
    fetchAPI<{ assets: Asset[] }>(`/api/assets/${projectId}`)
      .then((data) => {
        setAssets(data.assets ?? [])
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const filteredAssets =
    activeFilter === "all"
      ? assets
      : assets.filter((a) => a.type === activeFilter)

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-900 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveFilter(tab.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === tab.value
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Empty state */}
      {!loading && filteredAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-16">
          <svg
            className="mb-3 h-12 w-12 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-500">No assets generated yet</p>
        </div>
      )}

      {/* Asset grid */}
      {!loading && filteredAssets.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filteredAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  )
}
