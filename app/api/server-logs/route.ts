import { NextResponse } from "next/server"

// Sistema global de logs em memória
let globalServerLogs: any[] = []

export function addServerLog(logEntry: any) {
  globalServerLogs.unshift(logEntry)
  if (globalServerLogs.length > 200) {
    globalServerLogs.splice(200)
  }
  console.log("📝 LOG ADICIONADO:", logEntry.id, logEntry.method, logEntry.path)
}

export function getServerLogs() {
  return globalServerLogs
}

export function clearServerLogs() {
  globalServerLogs = []
}

export async function GET() {
  console.log(`📊 GET /api/server-logs - Retornando ${globalServerLogs.length} logs`)

  return NextResponse.json({
    logs: globalServerLogs,
    total: globalServerLogs.length,
    timestamp: new Date().toISOString(),
  })
}

export async function DELETE() {
  console.log("🗑️ DELETE /api/server-logs - Limpando logs")
  clearServerLogs()

  return NextResponse.json({
    message: "Logs limpos com sucesso",
    timestamp: new Date().toISOString(),
  })
}
