"use client"

import useSWR from "swr"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Users, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { getAccidents, getUsers, type Accident } from "@/lib/api"

export function AnalyticsPanel() {
  const { data: accidents, isLoading: accidentsLoading } = useSWR("accidents", getAccidents)
  const { data: users, isLoading: usersLoading } = useSWR("admin/users", getUsers)

  const isLoading = accidentsLoading || usersLoading

  // Process accidents data for charts
  const processedData = processAccidentsData(accidents || [])

  // Calculate stats
  const totalIncidents = accidents?.length || 0
  const resolvedToday =
    accidents?.filter((a) => {
      const today = new Date().toDateString()
      return a.status === "confirmed" && new Date(a.created_at).toDateString() === today
    }).length || 0

  const activeOfficers = users?.filter((u) => u.role === "officer" && u.status === "APPROVED").length || 0
  const totalUsers = users?.length || 0

  const stats = [
    {
      label: "Total Incidents",
      value: totalIncidents.toLocaleString(),
      change: "+12%",
      trend: "up" as const,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/20",
    },
    {
      label: "Confirmed Today",
      value: resolvedToday.toString(),
      change: "+5%",
      trend: "up" as const,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/20",
    },
    {
      label: "Total Users",
      value: totalUsers.toString(),
      change: "+3",
      trend: "up" as const,
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      label: "Active Officers",
      value: activeOfficers.toString(),
      change: "+3",
      trend: "up" as const,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Traffic incident statistics and trends</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isPositive = stat.trend === "up"
          return (
            <Card key={stat.label} className="glass border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                    <Icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      isPositive ? "text-success" : "text-destructive",
                    )}
                  >
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Incident Frequency Chart */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Incident Frequency</CardTitle>
            <CardDescription>Weekly breakdown by severity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedData.weeklyData}>
                  <defs>
                    <linearGradient id="severeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E03131" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E03131" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="moderateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFC107" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FFC107" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="day" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30, 30, 46, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area type="monotone" dataKey="severe" stroke="#E03131" fill="url(#severeGradient)" strokeWidth={2} />
                  <Area
                    type="monotone"
                    dataKey="moderate"
                    stroke="#FFC107"
                    fill="url(#moderateGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-xs text-muted-foreground">Severe (4-5)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-xs text-muted-foreground">Moderate (1-3)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours Chart */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Peak Incident Hours</CardTitle>
            <CardDescription>When most incidents are reported</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="hour" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30, 30, 46, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="incidents" fill="#007BFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function processAccidentsData(accidents: Accident[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const weeklyData = days.map((day) => ({ day, severe: 0, moderate: 0 }))
  const hourlyData = [
    { hour: "6am", incidents: 0 },
    { hour: "9am", incidents: 0 },
    { hour: "12pm", incidents: 0 },
    { hour: "3pm", incidents: 0 },
    { hour: "6pm", incidents: 0 },
    { hour: "9pm", incidents: 0 },
  ]

  accidents.forEach((accident) => {
    const date = new Date(accident.created_at)
    const dayIndex = date.getDay()
    const hour = date.getHours()

    // Weekly data
    if (accident.severity >= 4) {
      weeklyData[dayIndex].severe++
    } else {
      weeklyData[dayIndex].moderate++
    }

    // Hourly data
    if (hour >= 6 && hour < 9) hourlyData[0].incidents++
    else if (hour >= 9 && hour < 12) hourlyData[1].incidents++
    else if (hour >= 12 && hour < 15) hourlyData[2].incidents++
    else if (hour >= 15 && hour < 18) hourlyData[3].incidents++
    else if (hour >= 18 && hour < 21) hourlyData[4].incidents++
    else if (hour >= 21 || hour < 6) hourlyData[5].incidents++
  })

  // Reorder weekly data to start from Monday
  const reorderedWeekly = [...weeklyData.slice(1), weeklyData[0]]

  return {
    weeklyData: reorderedWeekly,
    hourlyData,
  }
}
