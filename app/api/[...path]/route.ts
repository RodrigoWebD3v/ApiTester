import { type NextRequest, NextResponse } from "next/server"

// Simular um banco de dados de endpoints em memória
const endpoints = new Map()

// Endpoint padrão de exemplo
endpoints.set("/api/test", {
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
})

function logRequest(req: NextRequest, path: string, responseData: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: path,
    headers: Object.fromEntries(req.headers.entries()),
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    response: {
      status: responseData.status,
      contentType: responseData.contentType,
    },
  }

  console.log("API Request Log:", JSON.stringify(logEntry, null, 2))
  return logEntry
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = "/" + params.path.join("/")
  const fullPath = "/api" + path

  const endpoint = endpoints.get(fullPath)

  if (!endpoint) {
    const responseData = { status: 404, contentType: "application/json" }
    logRequest(request, fullPath, responseData)

    return NextResponse.json({ error: "Endpoint não encontrado", path: fullPath }, { status: 404 })
  }

  const responseData = {
    status: endpoint.statusCode,
    contentType: endpoint.responseType,
  }
  logRequest(request, fullPath, responseData)

  return new NextResponse(endpoint.responseBody, {
    status: endpoint.statusCode,
    headers: {
      "Content-Type": endpoint.responseType,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = "/" + params.path.join("/")
  const fullPath = "/api" + path

  let requestBody = ""
  try {
    requestBody = await request.text()
  } catch (error) {
    console.error("Erro ao ler corpo da requisição:", error)
  }

  const endpoint = endpoints.get(fullPath)

  if (!endpoint) {
    const responseData = { status: 404, contentType: "application/json" }
    logRequest(request, fullPath, responseData)

    return NextResponse.json({ error: "Endpoint não encontrado", path: fullPath }, { status: 404 })
  }

  // Processar o corpo da requisição se necessário
  let processedResponse = endpoint.responseBody

  // Se for XML, adicionar dados da requisição
  if (endpoint.responseType === "application/xml" && requestBody) {
    try {
      const requestData = JSON.parse(requestBody)
      processedResponse = endpoint.responseBody.replace(
        "</response>",
        `  <requestData>${JSON.stringify(requestData)}</requestData>\n</response>`,
      )
    } catch {
      // Se não for JSON válido, adicionar como texto
      processedResponse = endpoint.responseBody.replace(
        "</response>",
        `  <requestBody><![CDATA[${requestBody}]]></requestBody>\n</response>`,
      )
    }
  }

  const responseData = {
    status: endpoint.statusCode,
    contentType: endpoint.responseType,
  }
  logRequest(request, fullPath, responseData)

  return new NextResponse(processedResponse, {
    status: endpoint.statusCode,
    headers: {
      "Content-Type": endpoint.responseType,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return POST(request, { params })
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return POST(request, { params })
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return POST(request, { params })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
