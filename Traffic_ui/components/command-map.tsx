"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import useSWR from "swr"
import {
  Search,
  Layers,
  Navigation,
  AlertTriangle,
  Car,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  MessageSquare,
  ThumbsUp,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MobileBottomSheet } from "@/components/mobile-bottom-sheet"
import {
  getAccidents,
  updateAccidentStatus,
  getComments,
  addComment,
  deleteComment,
  voteComment,
  banUser,
  type Accident,
  type Comment,
} from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import type L from "leaflet"

const LeafletMap = dynamic(() => import("@/components/leaflet-map").then((mod) => mod.LeafletMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0d1117] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
})

type LayerType = "traffic" | "heatmap" | "satellite"
type IncidentType = "severe" | "moderate" | "pending" | "cleared"

interface Incident {
  id: string
  type: IncidentType
  title: string
  location: string
  time: string
  lat: number
  lng: number
  status: string
  severity: number
  photo_url?: string
  reporter_username?: string
  casualties_injured?: number
  casualties_dead?: number
}

function accidentToIncident(accident: Accident): Incident {
  const severityMap: Record<number, IncidentType> = {
    5: "severe",
    4: "severe",
    3: "moderate",
    2: "moderate",
    1: "cleared",
  }

  let type: IncidentType
  if (accident.status === "pending_verification") {
    type = "pending"
  } else if (accident.status === "false_report") {
    type = "cleared"
  } else {
    type = severityMap[accident.severity] || "moderate"
  }

  const timeAgo = getTimeAgo(new Date(accident.created_at))

  return {
    id: accident.id,
    type,
    title: accident.description?.slice(0, 50) || "Traffic Incident",
    location: `${accident.latitude.toFixed(4)}, ${accident.longitude.toFixed(4)}`,
    time: timeAgo,
    lat: accident.latitude,
    lng: accident.longitude,
    status: accident.status,
    severity: accident.severity,
    photo_url: accident.photo_url,
    reporter_username: accident.reporter_username,
    casualties_injured: accident.casualties_injured,
    casualties_dead: accident.casualties_dead,
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} mins ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  return `${diffDays} days ago`
}

const incidentStyles: Record<IncidentType, { bg: string; icon: typeof AlertTriangle; pulse?: boolean }> = {
  severe: { bg: "bg-destructive", icon: AlertTriangle, pulse: true },
  moderate: { bg: "bg-warning", icon: Car },
  pending: { bg: "bg-primary", icon: Clock },
  cleared: { bg: "bg-success", icon: CheckCircle },
}

const statusDisplay: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_verification: { label: "Pending Verification", color: "text-primary bg-primary/20", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-success bg-success/20", icon: CheckCircle },
  false_report: { label: "False Report", color: "text-muted-foreground bg-muted", icon: XCircle },
}

function CommentSection({
  accidentId,
  isAdmin,
  isLoggedIn,
}: {
  accidentId: string
  isAdmin: boolean
  isLoggedIn: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [votedComments, setVotedComments] = useState<Set<string>>(new Set())
  const [banningUser, setBanningUser] = useState<string | null>(null)

  const {
    data: comments,
    isLoading,
    mutate,
  } = useSWR(isExpanded ? `comments-${accidentId}` : null, () => getComments(accidentId), {
    revalidateOnFocus: false,
  })

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await addComment(accidentId, newComment.trim())
      setNewComment("")
      await mutate()
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Failed to add comment:", err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVote = async (commentId: string) => {
    if (votedComments.has(commentId)) return

    try {
      await voteComment(commentId)
      setVotedComments((prev) => new Set(prev).add(commentId))
      await mutate()
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Failed to vote:", err.message)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId)
      await mutate()
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Failed to delete comment:", err.message)
    }
  }

  const handleBanUser = async (userId: string, duration: "1day" | "1week" | "permanent") => {
    setBanningUser(userId)
    try {
      await banUser(userId, duration)
      await mutate()
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Failed to ban user:", err.message)
    } finally {
      setBanningUser(null)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="border-t border-border pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span>Comments {comments?.length ? `(${comments.length})` : ""}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Add comment form */}
          {isLoggedIn ? (
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 min-h-[60px] resize-none bg-background/50 border-border text-sm"
                maxLength={500}
              />
              <Button
                size="icon"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="shrink-0 self-end"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">Log in to comment</p>
          )}

          {/* Comments list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !comments?.length ? (
              <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
            ) : (
              comments.map((comment: Comment) => (
                <div key={comment.id} className="p-2 rounded-lg bg-background/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{comment.author_username}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        {/* Ban user dropdown */}
                        <div className="relative group">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-6 h-6 text-warning hover:text-warning hover:bg-warning/10"
                            disabled={banningUser === comment.author_id}
                          >
                            {banningUser === comment.author_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                          </Button>
                          <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
                            <div className="glass rounded-lg p-1 flex flex-col gap-1 min-w-[100px]">
                              <button
                                onClick={() => handleBanUser(comment.author_id, "1day")}
                                className="text-xs px-2 py-1 rounded hover:bg-warning/20 text-left text-warning"
                              >
                                Ban 1 day
                              </button>
                              <button
                                onClick={() => handleBanUser(comment.author_id, "1week")}
                                className="text-xs px-2 py-1 rounded hover:bg-warning/20 text-left text-warning"
                              >
                                Ban 1 week
                              </button>
                              <button
                                onClick={() => handleBanUser(comment.author_id, "permanent")}
                                className="text-xs px-2 py-1 rounded hover:bg-destructive/20 text-left text-destructive"
                              >
                                Permanent
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Delete comment */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90">{comment.content}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVote(comment.id)}
                      disabled={!isLoggedIn || votedComments.has(comment.id)}
                      className={cn(
                        "flex items-center gap-1 text-xs transition-colors",
                        votedComments.has(comment.id)
                          ? "text-primary"
                          : isLoggedIn
                            ? "text-muted-foreground hover:text-primary"
                            : "text-muted-foreground/50 cursor-not-allowed",
                      )}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{comment.score}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CommandMap() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeLayer, setActiveLayer] = useState<LayerType>("traffic")
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const {
    data: accidents,
    isLoading,
    mutate,
  } = useSWR("accidents", getAccidents, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const incidents: Incident[] = accidents?.map(accidentToIncident) || []

  const layers: { id: LayerType; label: string }[] = [
    { id: "traffic", label: "Traffic" },
    { id: "heatmap", label: "Heatmap" },
    { id: "satellite", label: "Satellite" },
  ]

  const handleUpdateStatus = async (status: "confirmed" | "false_report") => {
    if (!selectedIncident) return

    setIsUpdatingStatus(true)
    try {
      await updateAccidentStatus(selectedIncident.id, status)
      await mutate() // Refresh the accidents list
      setSelectedIncident(null)
    } catch (error) {
      console.error("Failed to update status:", error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleGetLocation = useCallback(() => {
    if (!mapInstance) return

    setIsLocating(true)

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          mapInstance.flyTo([latitude, longitude], 15, { duration: 1 })
          setIsLocating(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          setIsLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000 },
      )
    } else {
      setIsLocating(false)
    }
  }, [mapInstance])

  const handleMapReady = useCallback((map: L.Map) => {
    setMapInstance(map)
  }, [])

  const filteredIncidents = incidents.filter(
    (incident) =>
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const canVerify = user?.role === "officer" || user?.role === "admin"
  const isAdmin = user?.role === "admin"
  const isLoggedIn = !!user

  return (
    <div className="relative w-full h-[calc(100vh-4rem)]">
      <LeafletMap
        incidents={filteredIncidents}
        activeLayer={activeLayer}
        selectedIncident={selectedIncident}
        onSelectIncident={setSelectedIncident}
        onMapReady={handleMapReady}
      />

      {/* Floating Search Bar */}
      <div className="absolute top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[480px] z-[1000]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search location or coordinates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 glass border-0 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 rounded-xl"
          />
        </div>
      </div>

      {/* Layer Toggle */}
      <div className="absolute top-20 md:top-4 right-4 z-[1000]">
        <div className="glass rounded-xl p-1 flex flex-col gap-1">
          <div className="p-2 border-b border-border/50">
            <Layers className="w-5 h-5 text-muted-foreground" />
          </div>
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                activeLayer === layer.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* My Location Button */}
      <div className="absolute bottom-24 md:bottom-6 right-4 z-[1000]">
        <Button
          size="icon"
          className="w-12 h-12 rounded-full glass border-0 hover:bg-primary/20"
          onClick={handleGetLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Navigation className="w-5 h-5 text-primary" />
          )}
        </Button>
      </div>

      {/* Desktop Incident Panel */}
      <div className="hidden md:block absolute bottom-6 left-4 w-80 z-[1000]">
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent Incidents</h3>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No incidents reported</p>
            ) : (
              filteredIncidents.map((incident) => {
                const style = incidentStyles[incident.type]
                const Icon = style.icon
                const statusInfo = statusDisplay[incident.status]
                return (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left",
                      selectedIncident?.id === incident.id ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-accent",
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", style.bg)}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{incident.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{incident.location}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{incident.time}</span>
                        {statusInfo && (
                          <span className={cn("text-xs px-1.5 py-0.5 rounded", statusInfo.color)}>
                            {statusInfo.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet for Incidents */}
      <MobileBottomSheet title="Recent Incidents">
        <div className="space-y-2">
          {filteredIncidents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No incidents reported</p>
          ) : (
            filteredIncidents.map((incident) => {
              const style = incidentStyles[incident.type]
              const Icon = style.icon
              const statusInfo = statusDisplay[incident.status]
              return (
                <button
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-all text-left"
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", style.bg)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{incident.title}</p>
                    <p className="text-sm text-muted-foreground">{incident.location}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{incident.time}</span>
                      {statusInfo && (
                        <span className={cn("text-xs px-1.5 py-0.5 rounded", statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </MobileBottomSheet>

      {selectedIncident && (
        <div className="absolute inset-0 flex items-center justify-center z-[1001] p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedIncident(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                  incidentStyles[selectedIncident.type].bg,
                  selectedIncident.type === "severe" && "pulse-danger",
                )}
              >
                {(() => {
                  const Icon = incidentStyles[selectedIncident.type].icon
                  return <Icon className="w-6 h-6 text-white" />
                })()}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">{selectedIncident.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedIncident.location}</p>
                {selectedIncident.reporter_username && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Reported by: {selectedIncident.reporter_username}
                  </p>
                )}
              </div>
            </div>

            {selectedIncident.photo_url && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={selectedIncident.photo_url || "/placeholder.svg"}
                  alt="Incident photo"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Reported {selectedIncident.time}</span>
              {statusDisplay[selectedIncident.status] && (
                <span className={cn("px-2 py-0.5 rounded-full text-xs", statusDisplay[selectedIncident.status].color)}>
                  {statusDisplay[selectedIncident.status].label}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs">
                Severity: {selectedIncident.severity}
              </span>
            </div>

            {selectedIncident.casualties_injured || selectedIncident.casualties_dead ? (
              <div className="flex gap-4 text-sm">
                {selectedIncident.casualties_injured ? (
                  <span className="text-warning">Injured: {selectedIncident.casualties_injured}</span>
                ) : null}
                {selectedIncident.casualties_dead ? (
                  <span className="text-destructive">Fatalities: {selectedIncident.casualties_dead}</span>
                ) : null}
              </div>
            ) : null}

            <div className="text-xs text-muted-foreground">
              Coordinates: {selectedIncident.lat.toFixed(6)}, {selectedIncident.lng.toFixed(6)}
            </div>

            {canVerify && selectedIncident.status === "pending_verification" && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Verify this incident</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => handleUpdateStatus("confirmed")}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                    onClick={() => handleUpdateStatus("false_report")}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    False Report
                  </Button>
                </div>
              </div>
            )}

            <CommentSection accidentId={selectedIncident.id} isAdmin={isAdmin} isLoggedIn={isLoggedIn} />

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setSelectedIncident(null)}>
                Navigate
              </Button>
              <Button variant="outline" onClick={() => setSelectedIncident(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
