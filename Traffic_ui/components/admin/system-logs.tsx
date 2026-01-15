"use client"

import { useState } from "react"
import useSWR from "swr"
import { AlertTriangle, CheckCircle, Info, XCircle, Filter, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getAccidents, type Accident } from "@/lib/api"

type LogLevel = "info" | "success" | "warning" | "error"

interface LogEntry {
  id: string
  level: LogLevel
  message: string
  timestamp: string
  source: string
}

const logStyles: Record<LogLevel, { bg: string; text: string; icon: typeof Info }> = {
  info: { bg: "bg-primary/20", text: "text-primary", icon: Info },
  success: { bg: "bg-success/20", text: "text-success", icon: CheckCircle },
  warning: { bg: "bg-warning/20", text: "text-warning", icon: AlertTriangle },
  error: { bg: "bg-destructive/20", text: "text-destructive", icon: XCircle },
}

function accidentsToLogs(accidents: Accident[]): LogEntry[] {
  return accidents
    .slice(0, 20) // Limit to last 20
    .map((accident) => {
      let level: LogLevel = "info"
      let message = ""

      if (accident.status === "confirmed") {
        level = "success"
        message = `Incident confirmed: ${accident.description?.slice(0, 50) || "Traffic incident"}`
      } else if (accident.status === "false_report") {
        level = "error"
        message = `False report flagged: ${accident.description?.slice(0, 50) || "Traffic incident"}`
      } else if (accident.severity >= 4) {
        level = "warning"
        message = `High severity incident reported: ${accident.description?.slice(0, 50) || "Traffic incident"}`
      } else {
        level = "info"
        message = `New incident report: ${accident.description?.slice(0, 50) || "Traffic incident"}`
      }

      return {
        id: accident.id,
        level,
        message,
        timestamp: new Date(accident.created_at).toLocaleString(),
        source: "Accidents",
      }
    })
}

export function SystemLogs() {
  const [filter, setFilter] = useState<LogLevel | "all">("all")

  const {
    data: accidents,
    isLoading,
    mutate,
  } = useSWR("accidents-logs", getAccidents, {
    refreshInterval: 30000,
  })

  const [isRefreshing, setIsRefreshing] = useState(false)

  const logs = accidentsToLogs(accidents || [])
  const filteredLogs = filter === "all" ? logs : logs.filter((log) => log.level === filter)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading logs...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor system activity and events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {(["all", "info", "success", "warning", "error"] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
              filter === level
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="glass rounded-xl divide-y divide-border/50">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No logs to display</div>
        ) : (
          filteredLogs.map((log) => {
            const style = logStyles[log.level]
            const Icon = style.icon

            return (
              <div key={log.id} className="p-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", style.bg)}>
                    <Icon className={cn("w-4 h-4", style.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{log.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>{log.timestamp}</span>
                      <span className="px-2 py-0.5 rounded bg-secondary">{log.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
