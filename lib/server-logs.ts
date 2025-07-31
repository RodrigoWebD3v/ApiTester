// Sistema global de logs para o servidor
interface ServerLogEntry {
  id: string
  timestamp: string
  method: string
  path: string
  requestHeaders: Record<string, string>
  requestBody: string
  userAgent: string
  ip: string
  contentType: string
  response: {
    status: number
    contentType: string
    body: string
    headers: Record<string, string>
  }
  processingTime: number
  source: string
}

// Armazenar logs em memória (em produção, usar banco de dados)
let serverLogs: ServerLogEntry[] = []

export function addServerLog(logEntry: ServerLogEntry) {
  serverLogs.unshift(logEntry) // Adicionar no início
  // Manter apenas os últimos 200 logs
  if (serverLogs.length > 200) {
    serverLogs.splice(200)
  }

  // Log no console para debug
  console.log("📝 LOG SALVO:", {
    id: logEntry.id,
    method: logEntry.method,
    path: logEntry.path,
    status: logEntry.response.status,
    timestamp: logEntry.timestamp,
  })
}

export function getServerLogs(): ServerLogEntry[] {
  return [...serverLogs] // Retornar cópia para evitar mutações
}

export function clearServerLogs() {
  serverLogs = []
  console.log("🗑️ Logs do servidor limpos")
}

export function createLogEntry(
  req: Request,
  path: string,
  requestBody: string,
  responseData: any,
  processingTime: number,
): ServerLogEntry {
  const headers = Object.fromEntries(req.headers.entries())

  const logEntry: ServerLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: path,
    requestHeaders: headers,
    requestBody: requestBody,
    userAgent: headers["user-agent"] || "Unknown",
    ip: headers["x-forwarded-for"] || headers["x-real-ip"] || "Unknown",
    contentType: headers["content-type"] || "Unknown",
    response: {
      status: responseData.status,
      contentType: responseData.contentType,
      body: responseData.body,
      headers: responseData.headers || {},
    },
    processingTime: processingTime,
    source: "endpoint",
  }

  console.log("=== NOVA REQUISIÇÃO RECEBIDA ===")
  console.log(`🔥 ${req.method} ${path}`)
  console.log(`📱 User-Agent: ${logEntry.userAgent}`)
  console.log(`🌐 IP: ${logEntry.ip}`)
  console.log(`📝 Body: ${requestBody}`)
  console.log(`✅ Status: ${responseData.status}`)
  console.log(`⏱️ Tempo: ${processingTime}ms`)
  console.log("================================")

  addServerLog(logEntry)
  return logEntry
}
