"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  MapPin,
  Crosshair,
  AlertTriangle,
  Car,
  Construction,
  CloudRain,
  Camera,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { reportAccident } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

type IncidentType = "accident" | "hazard" | "construction" | "weather" | "other"
type Severity = 1 | 2 | 3 | 4 | 5

interface ReportData {
  type: IncidentType | null
  severity: Severity | null
  latitude: number | null
  longitude: number | null
  locationName: string
  description: string
  casualties_injured: number
  casualties_dead: number
  image: File | null
}

const incidentTypes: { id: IncidentType; label: string; icon: typeof AlertTriangle; description: string }[] = [
  { id: "accident", label: "Accident", icon: Car, description: "Vehicle collision or incident" },
  { id: "hazard", label: "Road Hazard", icon: AlertTriangle, description: "Debris, potholes, or obstacles" },
  { id: "construction", label: "Construction", icon: Construction, description: "Road work or lane closure" },
  { id: "weather", label: "Weather", icon: CloudRain, description: "Flooding, ice, or poor visibility" },
  { id: "other", label: "Other", icon: MapPin, description: "Other traffic concern" },
]

const severityLevels: { id: Severity; label: string; color: string; bgColor: string; description: string }[] = [
  {
    id: 1,
    label: "Minor",
    color: "text-success",
    bgColor: "bg-success/20 border-success/30 hover:bg-success/30",
    description: "No injuries, minor impact",
  },
  {
    id: 2,
    label: "Low",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30",
    description: "Minor delays expected",
  },
  {
    id: 3,
    label: "Moderate",
    color: "text-warning",
    bgColor: "bg-warning/20 border-warning/30 hover:bg-warning/30",
    description: "Some injuries possible",
  },
  {
    id: 4,
    label: "High",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20 border-orange-500/30 hover:bg-orange-500/30",
    description: "Serious injuries likely",
  },
  {
    id: 5,
    label: "Severe",
    color: "text-destructive",
    bgColor: "bg-destructive/20 border-destructive/30 hover:bg-destructive/30",
    description: "Fatalities possible",
  },
]

export function ReportWizard() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const [step, setStep] = useState(1)
  const [isLocating, setIsLocating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [reportData, setReportData] = useState<ReportData>({
    type: null,
    severity: null,
    latitude: null,
    longitude: null,
    locationName: "",
    description: "",
    casualties_injured: 0,
    casualties_dead: 0,
    image: null,
  })

  const handleSnapToLocation = async () => {
    setIsLocating(true)
    setError(null)

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setReportData((prev) => ({
            ...prev,
            latitude,
            longitude,
            locationName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          }))
          setIsLocating(false)
        },
        (err) => {
          setError("Could not get location. Please enter manually.")
          setIsLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000 },
      )
    } else {
      setError("Geolocation is not supported by your browser.")
      setIsLocating(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"]
      if (allowedTypes.includes(file.type)) {
        setReportData((prev) => ({ ...prev, image: file }))
        setError(null)
      } else {
        setError("Please upload a JPG, PNG, or GIF image.")
      }
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!reportData.latitude || !reportData.longitude) {
      setError("Please provide a location.")
      return
    }

    if (!reportData.description || reportData.description.length < 10) {
      setError("Please provide a description (at least 10 characters).")
      return
    }

    // Validate severity vs casualties
    if (reportData.casualties_dead > 0 && (reportData.severity || 0) < 4) {
      setError("If there are fatalities, severity must be 4 or 5.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("latitude", String(reportData.latitude))
      formData.append("longitude", String(reportData.longitude))
      formData.append("description", reportData.description)
      formData.append("severity", String(reportData.severity || 3))
      formData.append("casualties_injured", String(reportData.casualties_injured))
      formData.append("casualties_dead", String(reportData.casualties_dead))

      if (reportData.image) {
        formData.append("photo", reportData.image)
      }

      await reportAccident(formData)

      // Calculate points earned (matches backend logic)
      const points = reportData.severity === 5 ? 100 : 10
      setPointsEarned(points)
      setIsSuccess(true)
      await refreshUser()
    } catch (err: unknown) {
      const apiError = err as { message?: string; status?: number }
      if (apiError.status === 429) {
        setError("Please wait 2 minutes between reports.")
      } else {
        setError(apiError.message || "Failed to submit report. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return reportData.type !== null
      case 2:
        return reportData.severity !== null
      case 3:
        return reportData.latitude !== null && reportData.longitude !== null
      default:
        return reportData.description.length >= 10
    }
  }

  const resetForm = () => {
    setStep(1)
    setIsSuccess(false)
    setError(null)
    setReportData({
      type: null,
      severity: null,
      latitude: null,
      longitude: null,
      locationName: "",
      description: "",
      casualties_injured: 0,
      casualties_dead: 0,
      image: null,
    })
  }

  if (!user) {
    return (
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Sign In Required</h2>
            <p className="text-muted-foreground mt-2">You need to be signed in to report incidents.</p>
          </div>
          <Button onClick={() => router.push("/login")} className="w-full">
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-success" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Report Submitted!</h2>
            <p className="text-muted-foreground mt-2">
              Thank you for helping keep our roads safe. Your report has been sent to our team for review.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-sm text-warning font-medium">+{pointsEarned} points earned!</p>
          </div>
          <Button onClick={resetForm} className="w-full">
            Submit Another Report
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                s < step && "bg-success text-success-foreground",
                s === step && "bg-primary text-primary-foreground",
                s > step && "bg-muted text-muted-foreground",
              )}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 4 && <div className={cn("w-8 h-0.5 transition-all", s < step ? "bg-success" : "bg-muted")} />}
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 md:p-8">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Incident Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">What happened?</h2>
              <p className="text-sm text-muted-foreground mt-1">Select the type of incident</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {incidentTypes.map((type) => {
                const Icon = type.icon
                const isSelected = reportData.type === type.id
                return (
                  <button
                    key={type.id}
                    onClick={() => setReportData((prev) => ({ ...prev, type: type.id }))}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 hover:bg-accent",
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>
                      {type.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Severity */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">How severe is it?</h2>
              <p className="text-sm text-muted-foreground mt-1">Help us prioritize the response</p>
            </div>
            <div className="space-y-3">
              {severityLevels.map((level) => {
                const isSelected = reportData.severity === level.id
                return (
                  <button
                    key={level.id}
                    onClick={() => setReportData((prev) => ({ ...prev, severity: level.id }))}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200",
                      isSelected ? `${level.bgColor} border-current ${level.color}` : "border-border hover:bg-accent",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          isSelected ? "bg-current text-background" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {level.id}
                      </div>
                      <div className="text-left">
                        <span className={cn("font-medium block", isSelected ? level.color : "text-foreground")}>
                          {level.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{level.description}</span>
                      </div>
                    </div>
                    {isSelected && <Check className={cn("w-5 h-5", level.color)} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Where is it?</h2>
              <p className="text-sm text-muted-foreground mt-1">Provide the incident location</p>
            </div>
            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={handleSnapToLocation}
                disabled={isLocating}
                className="w-full h-14 text-base font-medium gap-3 border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/10 transition-all bg-transparent"
              >
                {isLocating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <Crosshair className="w-5 h-5 text-primary" />
                )}
                <span className={isLocating ? "text-muted-foreground" : "text-primary"}>
                  {isLocating ? "Getting location..." : "Snap to My Location"}
                </span>
              </Button>

              {reportData.latitude && reportData.longitude && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Location captured: {reportData.latitude.toFixed(6)}, {reportData.longitude.toFixed(6)}
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-sm text-muted-foreground">or enter coordinates manually</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={reportData.latitude || ""}
                    onChange={(e) =>
                      setReportData((prev) => ({ ...prev, latitude: Number.parseFloat(e.target.value) || null }))
                    }
                    placeholder="e.g., 14.5995"
                    className="h-12 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={reportData.longitude || ""}
                    onChange={(e) =>
                      setReportData((prev) => ({ ...prev, longitude: Number.parseFloat(e.target.value) || null }))
                    }
                    placeholder="e.g., 120.9842"
                    className="h-12 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Describe the incident</h2>
              <p className="text-sm text-muted-foreground mt-1">Provide details (minimum 10 characters)</p>
            </div>
            <div className="space-y-4">
              <Textarea
                value={reportData.description}
                onChange={(e) => setReportData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what you see..."
                className="min-h-[120px] resize-none border-2 border-input focus:border-primary bg-transparent transition-colors"
              />
              <p className="text-xs text-muted-foreground text-right">
                {reportData.description.length}/10 characters minimum
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Injured</label>
                  <Input
                    type="number"
                    min="0"
                    value={reportData.casualties_injured}
                    onChange={(e) =>
                      setReportData((prev) => ({ ...prev, casualties_injured: Number.parseInt(e.target.value) || 0 }))
                    }
                    className="h-12 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fatalities</label>
                  <Input
                    type="number"
                    min="0"
                    value={reportData.casualties_dead}
                    onChange={(e) =>
                      setReportData((prev) => ({ ...prev, casualties_dead: Number.parseInt(e.target.value) || 0 }))
                    }
                    className="h-12 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
              </div>

              <label className="w-full flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent transition-all cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {reportData.image ? reportData.image.name : "Add Photo (optional - JPG, PNG, or GIF)"}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1 h-12">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="flex-1 h-12">
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()} className="flex-1 h-12">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Report
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
