import { Hono } from "hono"
import { prisma } from "@marionette/db"
import { NotFoundError } from "../middleware/error-handler.ts"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

export const assetRoutes = new Hono()

// GET /:projectId — list assets for project
assetRoutes.get("/:projectId", async (c) => {
  const projectId = c.req.param("projectId")

  const assets = await prisma.asset.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  })

  return c.json({
    assets: assets.map((asset) => ({
      id: asset.id,
      project_id: asset.projectId,
      type: asset.type,
      phase: asset.phase,
      agent_name: asset.agentName,
      scene_number: asset.sceneNumber,
      file_name: asset.fileName,
      mime_type: asset.mimeType,
      file_size: asset.fileSize,
      metadata: asset.metadata,
      created_at: asset.createdAt.toISOString(),
    })),
  })
})

// GET /download/:assetId — serve asset file for browser display
assetRoutes.get("/download/:assetId", async (c) => {
  const assetId = c.req.param("assetId")

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  })

  if (!asset) {
    throw new NotFoundError("Asset", assetId)
  }

  // Resolve relative paths against project root
  const absolutePath = resolve(asset.filePath)

  try {
    const fileBuffer = await readFile(absolutePath)
    c.header("Content-Type", asset.mimeType)
    c.header("Content-Disposition", `inline; filename="${asset.fileName}"`)
    c.header("Cache-Control", "public, max-age=3600")
    if (asset.fileSize) {
      c.header("Content-Length", String(asset.fileSize))
    }
    return c.body(fileBuffer)
  } catch {
    throw new NotFoundError("Asset file", absolutePath)
  }
})
