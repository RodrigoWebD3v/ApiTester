import { type NextRequest, NextResponse } from "next/server"

// Sistema de logs local (será sincronizado com o global)
let localServerLogs: any[] = []

function addToLocalLogs(logEntry: any) {
  localServerLogs.unshift(logEntry)
  if (localServerLogs.length > 200) {
    localServerLogs.splice(200)
  }
}

// Endpoints padrão sempre disponíveis
const defaultEndpoints = new Map([
  [
    "/api/test",
    {
      id: "default",
      path: "/api/test",
      method: "POST",
      responseType: "application/xml",
      responseBody: `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <status>success</status>
  <message>API funcionando corretamente</message>
  <timestamp>{{TIMESTAMP}}</timestamp>
</response>`,
      statusCode: 200,
    },
  ],
  [
    "/api/health",
    {
      id: "health",
      path: "/api/health",
      method: "GET",
      responseType: "application/json",
      responseBody: `{
  "status": "ok",
  "timestamp": "{{TIMESTAMP}}",
  "service": "API Tester"
}`,
      statusCode: 200,
    },
  ],
])

function createLogEntry(
  req: NextRequest,
  path: string,
  requestBody: string,
  responseData: any,
  processingTime: number,
) {
  const headers = Object.fromEntries(req.headers.entries())

  const logEntry = {
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

  addToLocalLogs(logEntry)
  return logEntry
}

async function handleRequest(request: NextRequest, params: { path: string[] }) {
  const startTime = Date.now()
  const pathArray = params.path || []
  const fullPath = "/api/" + pathArray.join("/")

  console.log(`\n🚀 REQUISIÇÃO RECEBIDA: ${request.method} ${fullPath}`)

  // Ler o corpo da requisição
  let requestBody = ""
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      requestBody = await request.text()
      console.log("📦 Corpo da requisição:", requestBody)
    }
  } catch (error) {
    console.error("❌ Erro ao ler corpo da requisição:", error)
    requestBody = `Erro ao ler corpo: ${error instanceof Error ? error.message : "Erro desconhecido"}`
  }

  // Verificar se é um endpoint padrão
  const endpoint = defaultEndpoints.get(fullPath)

  if (!endpoint) {
    const processingTime = Date.now() - startTime
    const responseBody = JSON.stringify({
      error: "Endpoint não encontrado",
      path: fullPath,
      availableEndpoints: Array.from(defaultEndpoints.keys()),
    })

    const responseData = {
      status: 404,
      contentType: "application/json",
      body: responseBody,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }

    // Salvar log
    createLogEntry(request, fullPath, requestBody, responseData, processingTime)

    return NextResponse.json(
      {
        error: "Endpoint não encontrado",
        path: fullPath,
        availableEndpoints: Array.from(defaultEndpoints.keys()),
      },
      {
        status: 404,
        headers: responseData.headers,
      },
    )
  }

  // Verificar se o método é permitido
  if (endpoint.method !== "ALL" && endpoint.method !== request.method) {
    const processingTime = Date.now() - startTime
    const responseBody = JSON.stringify({
      error: "Método não permitido",
      method: request.method,
      allowedMethod: endpoint.method,
    })

    const responseData = {
      status: 405,
      contentType: "application/json",
      body: responseBody,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }

    // Salvar log
    createLogEntry(request, fullPath, requestBody, responseData, processingTime)

    return NextResponse.json(
      {
        error: "Método não permitido",
        method: request.method,
        allowedMethod: endpoint.method,
      },
      {
        status: 405,
        headers: responseData.headers,
      },
    )
  }

  // Processar a resposta
  let processedResponse = endpoint.responseBody

  // Substituir placeholder de timestamp
  processedResponse = processedResponse.replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString())

  // Se for XML e houver corpo na requisição, adicionar dados da requisição
  if (endpoint.responseType === "application/xml" && requestBody) {
    try {
      const requestData = JSON.parse(requestBody)
      processedResponse = processedResponse.replace(
        "</response>",
        `  <requestData>${JSON.stringify(requestData)}</requestData>\n  <receivedAt>${new Date().toISOString()}</receivedAt>\n</response>`,
      )
    } catch {
      // Se não for JSON válido, adicionar como texto
      processedResponse = processedResponse.replace(
        "</response>",
        `  <requestBody><![CDATA[${requestBody}]]></requestBody>\n  <receivedAt>${new Date().toISOString()}</receivedAt>\n</response>`,
      )
    }
  }

  const processingTime = Date.now() - startTime
  const responseHeaders = {
    "Content-Type": endpoint.responseType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }

  const responseData = {
    status: endpoint.statusCode,
    contentType: endpoint.responseType,
    body: processedResponse,
    headers: responseHeaders,
  }

  // Salvar log ANTES de retornar a resposta
  createLogEntry(request, fullPath, requestBody, responseData, processingTime)

  console.log(`✅ Resposta enviada: ${endpoint.statusCode} (${processingTime}ms)`)

  return new NextResponse(processedResponse, {
    status: endpoint.statusCode,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  // Se for uma requisição para logs, retornar os logs locais
  const pathArray = params.path || []
  const fullPath = "/" + pathArray.join("/")

  if (fullPath === "/server-logs") {
    console.log(`📊 Retornando ${localServerLogs.length} logs locais`)
    return NextResponse.json({
      logs: localServerLogs,
      total: localServerLogs.length,
      timestamp: new Date().toISOString(),
    })
  }

  return handleRequest(request, params)
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params)
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params)
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  const pathArray = params.path || []
  const fullPath = "/" + pathArray.join("/")

  if (fullPath === "/server-logs") {
    console.log("🗑️ Limpando logs locais")
    localServerLogs = []
    return NextResponse.json({
      message: "Logs limpos com sucesso",
      timestamp: new Date().toISOString(),
    })
  }

  return handleRequest(request, params)
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params)
}

export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const processingTime = Date.now() - startTime

  const responseData = {
    status: 200,
    contentType: "text/plain",
    body: "CORS OK",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  }

  // Salvar log do CORS
  const headers = Object.fromEntries(request.headers.entries())
  const logEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    method: "OPTIONS",
    path: "CORS Preflight",
    requestHeaders: headers,
    requestBody: "",
    userAgent: headers["user-agent"] || "Unknown",
    ip: headers["x-forwarded-for"] || headers["x-real-ip"] || "Unknown",
    response: responseData,
    processingTime: processingTime,
    source: "cors",
  }

  addToLocalLogs(logEntry)
  console.log("🔄 CORS Preflight request handled")

  return new NextResponse(null, {
    status: 200,
    headers: responseData.headers,
  })
}
