"use client"

import type React from "react"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, AlertCircle, Check, Shield, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { applyOfficer } from "@/lib/api"

function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
}

export default function ApplyOfficerPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    badge_number: "",
    institution: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordValidation = useMemo(() => validatePassword(formData.password), [formData.password])
  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isPasswordValid) {
      setError("Password does not meet all requirements.")
      return
    }

    setIsLoading(true)

    try {
      await applyOfficer(formData)
      setSuccess(true)
    } catch (err: unknown) {
      const apiError = err as { message?: string; status?: number }
      if (apiError.status === 400 || apiError.status === 409) {
        const msg = apiError.message?.toLowerCase() || ""
        if (msg.includes("badge")) {
          setError("This badge number is already registered. Please verify your badge number.")
        } else if (msg.includes("email")) {
          setError("This email is already registered. Please use a different email address.")
        } else if (msg.includes("username")) {
          setError("This username is already taken. Please choose a different username.")
        } else {
          setError("This information is already registered. Please check your details.")
        }
      } else if (apiError.status === 422) {
        setError("Password must meet all requirements.")
      } else {
        setError(apiError.message || "Application failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md text-center">
          <div className="glass rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Application Submitted!</h2>
            <p className="text-muted-foreground mt-2">
              Your application is pending admin approval. You will be notified once reviewed.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Note: You will not be able to log in until your application is approved.
            </p>
            <Button onClick={() => router.push("/login")} className="mt-6">
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Apply as Officer</h1>
          <p className="text-muted-foreground mt-2">Submit your application to become a traffic officer</p>
        </div>

        <div className="glass rounded-2xl p-6 md:p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Choose a username"
                required
                className="h-12 bg-secondary/50 border-border focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Official Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your official email"
                required
                className="h-12 bg-secondary/50 border-border focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">Must be unique - not used by another officer</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge_number">Badge Number</Label>
              <Input
                id="badge_number"
                type="text"
                value={formData.badge_number}
                onChange={(e) => setFormData({ ...formData, badge_number: e.target.value })}
                placeholder="Enter your badge number"
                required
                className="h-12 bg-secondary/50 border-border focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">Must be unique - not used by another officer</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                placeholder="e.g., City Police Department"
                required
                className="h-12 bg-secondary/50 border-border focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create a password"
                  required
                  className="h-12 pr-12 bg-secondary/50 border-border focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  { key: "minLength", label: "At least 8 characters" },
                  { key: "hasUppercase", label: "One uppercase letter" },
                  { key: "hasNumber", label: "One number" },
                  { key: "hasSpecial", label: "One special character (!@#$%^&*...)" },
                ].map((req) => (
                  <div
                    key={req.key}
                    className={cn(
                      "flex items-center gap-2 text-xs transition-colors",
                      passwordValidation[req.key as keyof typeof passwordValidation]
                        ? "text-success"
                        : "text-muted-foreground",
                    )}
                  >
                    {passwordValidation[req.key as keyof typeof passwordValidation] ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isLoading || !isPasswordValid} className="w-full h-12">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
