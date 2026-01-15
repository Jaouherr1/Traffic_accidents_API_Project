"use client"

import type React from "react"

import { useState } from "react"
import useSWR from "swr"
import { Check, X, Mail, FileText, Loader2, AlertCircle, Badge, Shield, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { getPendingOfficers, processOfficer, processAdmin, type User } from "@/lib/api"

export function PendingApplications() {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [feedbackId, setFeedbackId] = useState<{ id: string; type: "approved" | "rejected" } | null>(null)

  const [adminUuid, setAdminUuid] = useState("")
  const [adminAction, setAdminAction] = useState<"approve" | "reject">("approve")
  const [adminProcessing, setAdminProcessing] = useState(false)
  const [adminError, setAdminError] = useState("")
  const [adminSuccess, setAdminSuccess] = useState("")

  const { data: applications, isLoading, error, mutate } = useSWR("admin/pending-officers", getPendingOfficers)

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    setProcessingId(userId)

    try {
      await processOfficer(userId, action)
      setFeedbackId({ id: userId, type: action === "approve" ? "approved" : "rejected" })

      setTimeout(() => {
        mutate()
        setProcessingId(null)
        setFeedbackId(null)
      }, 800)
    } catch (err) {
      setProcessingId(null)
      console.error("Failed to process application:", err)
    }
  }

  const handleAdminApproval = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError("")
    setAdminSuccess("")

    if (!adminUuid.trim()) {
      setAdminError("Please enter the Secret User ID from the email")
      return
    }

    setAdminProcessing(true)

    try {
      const result = await processAdmin(adminUuid.trim(), adminAction)
      setAdminSuccess(result.message || `Admin ${adminAction === "approve" ? "approved" : "rejected"} successfully!`)
      setAdminUuid("")
    } catch (err: unknown) {
      const apiError = err as { message?: string; status?: number }
      if (apiError.status === 404) {
        setAdminError("No pending admin found with this User ID")
      } else if (apiError.status === 403) {
        setAdminError("You don't have permission to perform this action")
      } else {
        setAdminError(apiError.message || "Failed to process admin request")
      }
    } finally {
      setAdminProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="glass rounded-xl p-6 border-2 border-primary/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Admin Approval</h2>
            <p className="text-sm text-muted-foreground">Enter the Secret User ID from the registration email</p>
          </div>
        </div>

        <form onSubmit={handleAdminApproval} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminUuid">Secret User ID (from email)</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="adminUuid"
                type="text"
                value={adminUuid}
                onChange={(e) => setAdminUuid(e.target.value)}
                className="pl-10 font-mono text-sm"
                placeholder="e.g., 2502c8c3-856f-467b-87d2-8afec28ff2ea"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              onClick={() => setAdminAction("approve")}
              disabled={adminProcessing}
              className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
            >
              {adminProcessing && adminAction === "approve" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Approve Admin
            </Button>
            <Button
              type="submit"
              onClick={() => setAdminAction("reject")}
              disabled={adminProcessing}
              variant="outline"
              className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              {adminProcessing && adminAction === "reject" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Reject Admin
            </Button>
          </div>

          {adminError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {adminError}
            </div>
          )}

          {adminSuccess && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
              {adminSuccess}
            </div>
          )}
        </form>
      </div>

      {/* Officer Applications Section */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Pending Officer Applications</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {applications?.length || 0} officer applications awaiting review
        </p>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Failed to load applications</h3>
            <p className="text-muted-foreground mt-2">Please check your permissions and try again.</p>
          </div>
        ) : !applications || applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center glass rounded-xl">
            <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <Check className="w-7 h-7 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
            <p className="text-muted-foreground mt-1">No pending officer applications.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map((app: User) => {
              const isProcessing = processingId === app.id
              const feedback = feedbackId?.id === app.id ? feedbackId.type : null

              return (
                <div
                  key={app.id}
                  className={cn(
                    "glass rounded-xl p-5 transition-all duration-500",
                    feedback === "approved" && "bg-success/10 translate-x-full opacity-0",
                    feedback === "rejected" && "bg-destructive/10 -translate-x-full opacity-0",
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                        <span className="text-lg font-semibold text-warning">
                          {app.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-foreground">{app.username}</h3>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                            PENDING
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            {app.email}
                          </span>
                          {app.badge_number && (
                            <span className="flex items-center gap-1.5">
                              <Badge className="w-4 h-4" />
                              {app.badge_number}
                            </span>
                          )}
                        </div>
                        {app.institution && (
                          <div className="mt-3 p-3 rounded-lg bg-secondary/50">
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-sm text-foreground">Institution: {app.institution}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 md:flex-col">
                      <Button
                        onClick={() => handleAction(app.id, "approve")}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none bg-success hover:bg-success/90 text-success-foreground"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleAction(app.id, "reject")}
                        disabled={isProcessing}
                        variant="outline"
                        className="flex-1 md:flex-none border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
