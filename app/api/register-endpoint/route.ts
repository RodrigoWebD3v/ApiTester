import { type NextRequest, NextResponse } from "next/server"

// Armazenar endpoints em memória (em produção, usar banco de dados)
const registeredEndpoints = new Map()

export async function POST(request: NextRequest) {
  try {
    const endpoint = await request.json()

    // Registrar o endpoint
    registeredEndpoints.set(endpoint.path, endpoint)

    console.log(`Endpoint registrado: ${endpoint.method} ${endpoint.path}`)

    return NextResponse.json({
      success: true,
      message: "Endpoint registrado com sucesso",
      endpoint: endpoint.path,
    })
  } catch (error) {
    console.error("Erro ao registrar endpoint:", error)
    return NextResponse.json({ success: false, message: "Erro ao registrar endpoint" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: Array.from(registeredEndpoints.values()),
  })
}
