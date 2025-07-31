import { type NextRequest, NextResponse } from "next/server"

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
  <timestamp>${new Date().toISOString()}</timestamp>
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
      responseBody: JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "API Tester",
      }),
      statusCode: 200,
    },
  ],
])

// Armazenar logs em memória (em produção, usar banco de dados)
const serverLogs: any[] = []

function saveServerLog(logEntry: any) {
  serverLogs.unshift(logEntry) // Adicionar no início
  // Manter apenas os últimos 200 logs
  if (serverLogs.length > 200) {
    serverLogs.splice(200)
  }
}

function createLogEntry(
  req: NextRequest,
  path: string,
  requestBody: string,
  responseData: any,
  processingTime: number,
) {
  const logEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: path,
    requestHeaders: Object.fromEntries(req.headers.entries()),
    requestBody: requestBody,
    userAgent: req.headers.get("user-agent") || "Unknown",
    ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown",
    contentType: req.headers.get("content-type") || "Unknown",
    response: {
      status: responseData.status,
      contentType: responseData.contentType,
      body: responseData.body,
      headers: responseData.headers || {},
    },
    processingTime: processingTime,
    source: "endpoint", // Para diferenciar de logs de teste
  }

  console.log("=== ENDPOINT REQUEST LOG ===")
  console.log(JSON.stringify(logEntry, null, 2))
  console.log("============================")

  saveServerLog(logEntry)
  return logEntry
}

async function handleRequest(request: NextRequest, params: { path: string[] }) {
  const startTime = Date.now()
  const pathArray = params.path || []
  const fullPath = "/api/" + pathArray.join("/")

  console.log(`\n🔥 NOVA REQUISIÇÃO: ${request.method} ${fullPath}`)

  // Ler o corpo da requisição
  let requestBody = ""
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      requestBody = await request.text()
      console.log("📝 Corpo da requisição:", requestBody)
    }
  } catch (error) {
    console.error("❌ Erro ao ler corpo da requisição:", error)
    requestBody = `Erro ao ler corpo: ${error instanceof Error ? error.message : "Erro desconhecido"}`
  }

  // Verificar se é um endpoint padrão
  const endpoint = defaultEndpoints.get(fullPath)

  if (!endpoint) {
    const processingTime = Date.now() - startTime
    const responseData = {
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Endpoint não encontrado",
        path: fullPath,
        availableEndpoints: Array.from(defaultEndpoints.keys()),
      }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }

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
    const responseData = {
      status: 405,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Método não permitido",
        method: request.method,
        allowedMethod: endpoint.method,
      }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }

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

  // Se for XML e houver corpo na requisição, adicionar dados da requisição
  if (endpoint.responseType === "application/xml" && requestBody) {
    try {
      const requestData = JSON.parse(requestBody)
      processedResponse = endpoint.responseBody.replace(
        "</response>",
        `  <requestData>${JSON.stringify(requestData)}</requestData>\n  <receivedAt>${new Date().toISOString()}</receivedAt>\n</response>`,
      )
    } catch {
      // Se não for JSON válido, adicionar como texto
      processedResponse = endpoint.responseBody.replace(
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

  createLogEntry(request, fullPath, requestBody, responseData, processingTime)

  console.log(`✅ Resposta enviada: ${endpoint.statusCode} (${processingTime}ms)`)

  return new NextResponse(processedResponse, {
    status: endpoint.statusCode,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params)
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params)
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params)
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params)
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params)
}

export async function OPTIONS(request: NextRequest) {
  const logEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    method: "OPTIONS",
    path: "CORS Preflight",
    requestHeaders: Object.fromEntries(request.headers.entries()),
    requestBody: "",
    userAgent: request.headers.get("user-agent") || "Unknown",
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
    response: {
      status: 200,
      contentType: "text/plain",
      body: "CORS OK",
    },
    processingTime: 0,
    source: "cors",
  }

  saveServerLog(logEntry)
  console.log("🔄 CORS Preflight request handled")

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
