"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Play, Eye, Settings, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ApiStatus } from "@/components/api-status"

interface Endpoint {
  id: string
  path: string
  method: string
  responseType: string
  responseBody: string
  statusCode: number
}

interface LogEntry {
  id: string
  timestamp: string
  endpoint: string
  method: string
  requestHeaders: Record<string, string>
  requestBody: string
  responseStatus: number
  responseHeaders: Record<string, string>
  responseBody: string
  duration: number
}

export default function ApiTester() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [serverLogs, setServerLogs] = useState<LogEntry[]>([])
  const [newEndpoint, setNewEndpoint] = useState<Endpoint>({
    id: "",
    path: "/api/test",
    method: "POST",
    responseType: "application/xml",
    responseBody:
      '<?xml version="1.0" encoding="UTF-8"?>\n<response>\n  <status>success</status>\n  <message>API funcionando corretamente</message>\n</response>',
    statusCode: 200,
  })
  const [testRequest, setTestRequest] = useState({
    url: typeof window !== "undefined" ? `${window.location.origin}/api/test` : "/api/test",
    method: "POST",
    headers: '{"Content-Type": "application/json"}',
    body: '{"test": "data", "message": "Testando API"}',
  })

  const { toast } = useToast()

  useEffect(() => {
    const savedEndpoints = localStorage.getItem("api-endpoints")
    const savedLogs = localStorage.getItem("api-logs")

    if (savedEndpoints) {
      setEndpoints(JSON.parse(savedEndpoints))
    }
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs))
    }
  }, [])

  useEffect(() => {
    fetchServerLogs()
    const interval = setInterval(fetchServerLogs, 5000) // Atualizar a cada 5 segundos
    return () => clearInterval(interval)
  }, [])

  const saveEndpoints = (newEndpoints: Endpoint[]) => {
    setEndpoints(newEndpoints)
    localStorage.setItem("api-endpoints", JSON.stringify(newEndpoints))
  }

  const saveLogs = (newLogs: LogEntry[]) => {
    setLogs(newLogs)
    localStorage.setItem("api-logs", JSON.stringify(newLogs))
  }

  const addEndpoint = () => {
    if (!newEndpoint.path) {
      toast({
        title: "Erro",
        description: "Path do endpoint é obrigatório",
        variant: "destructive",
      })
      return
    }

    const endpoint: Endpoint = {
      ...newEndpoint,
      id: Date.now().toString(),
    }

    const updatedEndpoints = [...endpoints, endpoint]
    saveEndpoints(updatedEndpoints)

    // Registrar o endpoint no servidor
    fetch("/api/register-endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(endpoint),
    })

    setNewEndpoint({
      id: "",
      path: "/api/test",
      method: "POST",
      responseType: "application/xml",
      responseBody:
        '<?xml version="1.0" encoding="UTF-8"?>\n<response>\n  <status>success</status>\n  <message>API funcionando corretamente</message>\n</response>',
      statusCode: 200,
    })

    toast({
      title: "Sucesso",
      description: "Endpoint criado com sucesso",
    })
  }

  const deleteEndpoint = (id: string) => {
    const updatedEndpoints = endpoints.filter((e) => e.id !== id)
    saveEndpoints(updatedEndpoints)

    toast({
      title: "Sucesso",
      description: "Endpoint removido",
    })
  }

  const testApi = async () => {
    if (!testRequest.url) {
      toast({
        title: "Erro",
        description: "URL é obrigatória",
        variant: "destructive",
      })
      return
    }

    const startTime = Date.now()

    try {
      let headers: Record<string, string> = {}
      try {
        headers = JSON.parse(testRequest.headers)
      } catch {
        headers = { "Content-Type": "application/json" }
        toast({
          title: "Aviso",
          description: "Headers inválidos, usando Content-Type padrão",
        })
      }

      console.log("Fazendo requisição para:", testRequest.url)
      console.log("Método:", testRequest.method)
      console.log("Headers:", headers)
      console.log("Body:", testRequest.body)

      const fetchOptions: RequestInit = {
        method: testRequest.method,
        headers,
      }

      // Só adicionar body se não for GET
      if (testRequest.method !== "GET" && testRequest.body) {
        fetchOptions.body = testRequest.body
      }

      const response = await fetch(testRequest.url, fetchOptions)

      const duration = Date.now() - startTime
      let responseText = ""

      try {
        responseText = await response.text()
      } catch (error) {
        responseText = `Erro ao ler resposta: ${error instanceof Error ? error.message : "Erro desconhecido"}`
      }

      console.log("Resposta recebida:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      })

      const logEntry: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        endpoint: testRequest.url,
        method: testRequest.method,
        requestHeaders: headers,
        requestBody: testRequest.body,
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody: responseText,
        duration,
      }

      const updatedLogs = [logEntry, ...logs].slice(0, 100)
      saveLogs(updatedLogs)

      const statusColor = response.status >= 200 && response.status < 300 ? "default" : "destructive"

      toast({
        title: "Teste realizado",
        description: `Status: ${response.status} ${response.statusText} | Tempo: ${duration}ms`,
        variant: statusColor === "destructive" ? "destructive" : "default",
      })
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"

      console.error("Erro na requisição:", error)

      const logEntry: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        endpoint: testRequest.url,
        method: testRequest.method,
        requestHeaders: (() => {
          try {
            return JSON.parse(testRequest.headers)
          } catch {
            return { "Content-Type": "application/json" }
          }
        })(),
        requestBody: testRequest.body,
        responseStatus: 0,
        responseHeaders: {},
        responseBody: `Erro de rede: ${errorMessage}`,
        duration,
      }

      const updatedLogs = [logEntry, ...logs].slice(0, 100)
      saveLogs(updatedLogs)

      toast({
        title: "Erro no teste",
        description: `Erro de rede: ${errorMessage}`,
        variant: "destructive",
      })
    }
  }

  const clearLogs = () => {
    setLogs([])
    localStorage.removeItem("api-logs")
    toast({
      title: "Logs limpos",
      description: "Todos os logs foram removidos",
    })
  }

  const fetchServerLogs = async () => {
    try {
      const response = await fetch("/api/server-logs")
      const data = await response.json()
      setServerLogs(data.logs || [])
    } catch (error) {
      console.error("Erro ao buscar logs do servidor:", error)
    }
  }

  const clearServerLogs = async () => {
    try {
      await fetch("/api/server-logs", { method: "DELETE" })
      setServerLogs([])
      toast({
        title: "Logs do servidor limpos",
        description: "Todos os logs do servidor foram removidos",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao limpar logs do servidor",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Tester</h1>
        <p className="text-muted-foreground mb-4">
          Interface para testar APIs com endpoints personalizados e logs detalhados
        </p>
        <ApiStatus />
      </div>

      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="endpoints" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Testar API
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Logs ({logs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Endpoint</CardTitle>
              <CardDescription>Configure um endpoint personalizado para testes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="path">Path do Endpoint</Label>
                  <Input
                    id="path"
                    value={newEndpoint.path}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, path: e.target.value })}
                    placeholder="/api/meu-endpoint"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Método HTTP</Label>
                  <Select
                    value={newEndpoint.method}
                    onValueChange={(value) => setNewEndpoint({ ...newEndpoint, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responseType">Tipo de Resposta</Label>
                  <Select
                    value={newEndpoint.responseType}
                    onValueChange={(value) => setNewEndpoint({ ...newEndpoint, responseType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application/xml">XML</SelectItem>
                      <SelectItem value="application/json">JSON</SelectItem>
                      <SelectItem value="text/plain">Texto</SelectItem>
                      <SelectItem value="text/html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statusCode">Status Code</Label>
                  <Input
                    id="statusCode"
                    type="number"
                    value={newEndpoint.statusCode}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, statusCode: Number.parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseBody">Corpo da Resposta</Label>
                <Textarea
                  id="responseBody"
                  value={newEndpoint.responseBody}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, responseBody: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={addEndpoint} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar Endpoint
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endpoints Configurados</CardTitle>
              <CardDescription>Lista de endpoints personalizados criados</CardDescription>
            </CardHeader>
            <CardContent>
              {endpoints.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum endpoint configurado</p>
              ) : (
                <div className="space-y-4">
                  {endpoints.map((endpoint) => (
                    <div key={endpoint.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={endpoint.method === "GET" ? "secondary" : "default"}>{endpoint.method}</Badge>
                        <code className="text-sm bg-muted px-2 py-1 rounded">{endpoint.path}</code>
                        <span className="text-sm text-muted-foreground">{endpoint.responseType}</span>
                        <Badge variant="outline">{endpoint.statusCode}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteEndpoint(endpoint.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Testar API</CardTitle>
              <CardDescription>Faça requisições para testar seus endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="testMethod">Método</Label>
                  <Select
                    value={testRequest.method}
                    onValueChange={(value) => setTestRequest({ ...testRequest, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="testUrl">URL</Label>
                  <Input
                    id="testUrl"
                    value={testRequest.url}
                    onChange={(e) => setTestRequest({ ...testRequest, url: e.target.value })}
                    placeholder="http://localhost:3000/api/test"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testHeaders">Headers (JSON)</Label>
                <Textarea
                  id="testHeaders"
                  value={testRequest.headers}
                  onChange={(e) => setTestRequest({ ...testRequest, headers: e.target.value })}
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>

              {testRequest.method !== "GET" && (
                <div className="space-y-2">
                  <Label htmlFor="testBody">Corpo da Requisição</Label>
                  <Textarea
                    id="testBody"
                    value={testRequest.body}
                    onChange={(e) => setTestRequest({ ...testRequest, body: e.target.value })}
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
              )}

              <Button onClick={testApi} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Executar Teste
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Logs de Teste</CardTitle>
                  <CardDescription>Requisições feitas pelo testador</CardDescription>
                </div>
                <Button variant="outline" onClick={clearLogs}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum log de teste</p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">TESTE</Badge>
                            <Badge variant={log.method === "GET" ? "secondary" : "default"}>{log.method}</Badge>
                            <code className="text-sm">{log.endpoint}</code>
                            <Badge
                              variant={
                                log.responseStatus >= 200 && log.responseStatus < 300 ? "default" : "destructive"
                              }
                            >
                              {log.responseStatus}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{log.duration}ms</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Ver detalhes
                          </summary>
                          <div className="mt-2 space-y-2">
                            <div>
                              <strong>Request Headers:</strong>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.requestHeaders, null, 2)}
                              </pre>
                            </div>
                            {log.requestBody && (
                              <div>
                                <strong>Request Body:</strong>
                                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">{log.requestBody}</pre>
                              </div>
                            )}
                            <div>
                              <strong>Response Headers:</strong>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.responseHeaders, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <strong>Response Body:</strong>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">{log.responseBody}</pre>
                            </div>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Logs do Servidor</CardTitle>
                  <CardDescription>Todas as requisições recebidas nos endpoints ({serverLogs.length})</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchServerLogs}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button variant="outline" onClick={clearServerLogs}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {serverLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma requisição recebida</p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {serverLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={log.source === "endpoint" ? "default" : "outline"}>
                              {log.source === "endpoint" ? "ENDPOINT" : "CORS"}
                            </Badge>
                            <Badge variant={log.method === "GET" ? "secondary" : "default"}>{log.method}</Badge>
                            <code className="text-sm">{log.path}</code>
                            <Badge
                              variant={
                                log.response.status >= 200 && log.response.status < 300 ? "default" : "destructive"
                              }
                            >
                              {log.response.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{log.processingTime}ms</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          IP: {log.ip} | User-Agent: {log.userAgent?.substring(0, 50)}...
                        </div>

                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Ver detalhes completos
                          </summary>
                          <div className="mt-2 space-y-2">
                            <div>
                              <strong>Request Headers:</strong>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.requestHeaders, null, 2)}
                              </pre>
                            </div>
                            {log.requestBody && (
                              <div>
                                <strong>Request Body:</strong>
                                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">{log.requestBody}</pre>
                              </div>
                            )}
                            <div>
                              <strong>Response Headers:</strong>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.response.headers, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <strong>Response Body:</strong>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">{log.response.body}</pre>
                            </div>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
