import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "API Tester",
    version: "1.0.0",
  })
}

export async function POST() {
  return NextResponse.json({
    status: "ok",
    method: "POST",
    timestamp: new Date().toISOString(),
    service: "API Tester",
  })
}
