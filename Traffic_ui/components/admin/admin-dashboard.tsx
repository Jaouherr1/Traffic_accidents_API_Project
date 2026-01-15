"use client"

import { useState } from "react"
import { Users, FileCheck, ScrollText, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserManagement } from "./user-management"
import { PendingApplications } from "./pending-applications"
import { SystemLogs } from "./system-logs"
import { AnalyticsPanel } from "./analytics-panel"

type AdminSection = "users" | "applications" | "logs" | "analytics"

const sidebarItems: { id: AdminSection; label: string; icon: typeof Users }[] = [
  { id: "users", label: "User Management", icon: Users },
  { id: "applications", label: "Pending Applications", icon: FileCheck },
  { id: "logs", label: "System Logs", icon: ScrollText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
]

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>("users")

  return (
    <div className="flex-1 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col glass border-r border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Admin Panel</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage system and users</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {item.id === "applications" && (
                  <span className="ml-auto text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">3</span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border">
        <div className="flex">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 transition-all",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.id === "applications" && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-warning rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto">
        {activeSection === "users" && <UserManagement />}
        {activeSection === "applications" && <PendingApplications />}
        {activeSection === "logs" && <SystemLogs />}
        {activeSection === "analytics" && <AnalyticsPanel />}
      </main>
    </div>
  )
}
