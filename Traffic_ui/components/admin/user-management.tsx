"use client"

import { useState } from "react"
import useSWR from "swr"
import { Search, Ban, Trash2, MoreHorizontal, Shield, UserIcon, Star, Check, Loader2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getUsers, banUser, deleteUser, type User } from "@/lib/api"

type UserRole = "user" | "officer" | "admin"
type UserStatus = "APPROVED" | "PENDING" | "BANNED" | "REJECTED"

const roleStyles: Record<UserRole, { bg: string; text: string; icon: typeof UserIcon }> = {
  admin: { bg: "bg-amber-500/20", text: "text-amber-400", icon: Shield },
  officer: { bg: "bg-primary/20", text: "text-primary", icon: Star },
  user: { bg: "bg-muted", text: "text-muted-foreground", icon: UserIcon },
}

const statusStyles: Record<UserStatus, { bg: string; text: string }> = {
  APPROVED: { bg: "bg-success/20", text: "text-success" },
  PENDING: { bg: "bg-warning/20", text: "text-warning" },
  BANNED: { bg: "bg-destructive/20", text: "text-destructive" },
  REJECTED: { bg: "bg-muted", text: "text-muted-foreground" },
}

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{
    id: string
    type: "success" | "error"
    message?: string
  } | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const { data: users, isLoading, error, mutate } = useSWR("admin/users", getUsers)

  const filteredUsers = (users || []).filter(
    (user: User) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleBan = async (userId: string, duration: "1day" | "1week" | "permanent" | "unban") => {
    setProcessingId(userId)
    try {
      await banUser(userId, duration)
      setActionFeedback({ id: userId, type: "success" })
      await mutate()
    } catch (err: unknown) {
      const error = err as { message?: string }
      setActionFeedback({ id: userId, type: "error", message: error.message })
    } finally {
      setProcessingId(null)
      setTimeout(() => setActionFeedback(null), 2000)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return

    setProcessingId(userId)
    try {
      await deleteUser(userId)
      setActionFeedback({ id: userId, type: "success" })
      setTimeout(() => mutate(), 500)
    } catch (err: unknown) {
      const error = err as { message?: string }
      setActionFeedback({ id: userId, type: "error", message: error.message })
    } finally {
      setProcessingId(null)
      setTimeout(() => setActionFeedback(null), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Failed to load users</h2>
        <p className="text-muted-foreground mt-2">Please check your permissions and try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{users?.length || 0} total users</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-border"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  User
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  Role
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Points
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: User) => {
                const roleStyle = roleStyles[user.role] || roleStyles.user
                const statusStyle = statusStyles[user.status] || statusStyles.APPROVED
                const RoleIcon = roleStyle.icon
                const isHovered = hoveredRow === user.id
                const hasFeedback = actionFeedback?.id === user.id
                const isProcessing = processingId === user.id

                return (
                  <tr
                    key={user.id}
                    onMouseEnter={() => setHoveredRow(user.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={cn(
                      "border-b border-border/50 transition-all duration-300",
                      isHovered && "bg-accent/50",
                      hasFeedback && actionFeedback.type === "success" && "bg-success/10",
                      hasFeedback && actionFeedback.type === "error" && "bg-destructive/10",
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            roleStyle.bg,
                            roleStyle.text,
                          )}
                        >
                          <span className="text-sm font-semibold">{user.username?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full uppercase",
                          roleStyle.bg,
                          roleStyle.text,
                        )}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full",
                          statusStyle.bg,
                          statusStyle.text,
                        )}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-sm text-warning font-medium">{(user.points || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />}

                        {/* Quick Action Tray - visible on hover (desktop) */}
                        <div
                          className={cn(
                            "hidden md:flex items-center gap-1 transition-all duration-200",
                            isHovered && !isProcessing
                              ? "opacity-100 translate-x-0"
                              : "opacity-0 translate-x-2 pointer-events-none",
                          )}
                        >
                          {user.status === "PENDING" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-success hover:text-success hover:bg-success/20"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-warning hover:bg-warning/20"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass border-border">
                              <DropdownMenuItem onClick={() => handleBan(user.id, "1day")}>Ban 1 Day</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBan(user.id, "1week")}>
                                Ban 1 Week
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleBan(user.id, "permanent")}
                                className="text-destructive"
                              >
                                Ban Permanently
                              </DropdownMenuItem>
                              {user.status === "BANNED" && (
                                <DropdownMenuItem onClick={() => handleBan(user.id, "unban")} className="text-success">
                                  Unban User
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/20"
                            onClick={() => handleDelete(user.id)}
                            disabled={user.role === "admin"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Mobile dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 md:hidden">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-border">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Ban className="w-4 h-4 mr-2" />
                                Ban User
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleBan(user.id, "1day")}>1 Day</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBan(user.id, "1week")}>1 Week</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBan(user.id, "permanent")}>
                                  Permanent
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            {user.status === "BANNED" && (
                              <DropdownMenuItem onClick={() => handleBan(user.id, "unban")} className="text-success">
                                <Check className="w-4 h-4 mr-2" />
                                Unban
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(user.id)}
                              className="text-destructive focus:text-destructive"
                              disabled={user.role === "admin"}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
