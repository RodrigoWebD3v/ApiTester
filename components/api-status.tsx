"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function ApiStatus() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking")
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkApiStatus = async () => {
    setStatus("checking")
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-cache",
      })

      if (response.ok) {
        setStatus("online")
      } else {
        setStatus("offline")
      }
    } catch (error) {
      console.error("Erro ao verificar status da API:", error)
      setStatus("offline")
    }
    setLastCheck(new Date())
  }

  useEffect(() => {
    checkApiStatus()
  }, [])

  return (
    <div className="flex items-center gap-2">
      <Badge variant={status === "online" ? "default" : status === "offline" ? "destructive" : "secondary"}>
        API {status === "online" ? "Online" : status === "offline" ? "Offline" : "Verificando..."}
      </Badge>
      <Button variant="ghost" size="sm" onClick={checkApiStatus} disabled={status === "checking"}>
        <RefreshCw className={`w-4 h-4 ${status === "checking" ? "animate-spin" : ""}`} />
      </Button>
      {lastCheck && (
        <span className="text-xs text-muted-foreground">Última verificação: {lastCheck.toLocaleTimeString()}</span>
      )}
    </div>
  )
}
