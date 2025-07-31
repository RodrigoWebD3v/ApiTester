import { NextResponse } from "next/server"

// Importar os logs do arquivo de rotas dinâmicas
// Como não podemos importar diretamente, vamos usar uma abordagem diferente
// Vamos criar um sistema de logs global

let globalServerLogs: any[] = []

export function addServerLog(logEntry: any) {
  globalServerLogs.unshift(logEntry)
  if (globalServerLogs.length > 200) {
    globalServerLogs.splice(200)
  }
}

export function getServerLogs() {
  return globalServerLogs
}

export async function GET() {
  return NextResponse.json({
    logs: globalServerLogs,
    total: globalServerLogs.length,
    timestamp: new Date().toISOString(),
  })
}

export async function DELETE() {
  globalServerLogs = []
  return NextResponse.json({
    message: "Logs limpos com sucesso",
    timestamp: new Date().toISOString(),
  })
}
