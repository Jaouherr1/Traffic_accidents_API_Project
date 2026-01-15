"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Shield, Loader2, CheckCircle, Lock, User, Building, KeyRound, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { registerAdmin } from "@/lib/api"

function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
}

export default function RegisterAdminPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    department: "",
    secret_invite_code: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const passwordValidation = useMemo(() => validatePassword(formData.password), [formData.password])
  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!isPasswordValid) {
      setError("Password does not meet all requirements")
      return
    }

    setIsLoading(true)

    try {
      await registerAdmin({
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name,
        department: formData.department,
        secret_invite_code: formData.secret_invite_code,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const apiError = err as { message?: string; status?: number }
      if (apiError.status === 403) {
        setError("Invalid secret invite code. Please contact the super admin for the correct code.")
      } else if (apiError.status === 409 || apiError.status === 400) {
        setError("Username already exists. Please choose a different username.")
      } else if (apiError.status === 422) {
        setError("Password must meet all requirements.")
      } else {
        setError(apiError.message || "Registration failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Request Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Your admin registration request has been submitted and is currently{" "}
            <span className="text-warning font-semibold">PENDING</span> approval.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            The Super Admin will receive an email with your Secret User ID. They will use this ID to approve your
            request. You will be able to log in once approved.
          </p>
          <Button onClick={() => router.push("/login")} className="w-full">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="glass rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Registration</h1>
          <p className="text-muted-foreground mt-2">Request administrator access with invite code</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="pl-10"
                placeholder="admin_username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="pl-10"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="department"
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="pl-10"
                placeholder="Traffic Control"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10"
                placeholder="Create a password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="pl-10"
                placeholder="Confirm your password"
                required
              />
            </div>
            {formData.confirmPassword && (
              <div
                className={cn(
                  "flex items-center gap-2 text-xs mt-1",
                  formData.password === formData.confirmPassword ? "text-success" : "text-destructive",
                )}
              >
                {formData.password === formData.confirmPassword ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Passwords match
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    Passwords do not match
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret_invite_code">Secret Invite Code</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="secret_invite_code"
                type="text"
                value={formData.secret_invite_code}
                onChange={(e) => setFormData({ ...formData, secret_invite_code: e.target.value })}
                className="pl-10"
                placeholder="Enter secret code"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">Contact Super Admin to obtain the secret invite code</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isPasswordValid || formData.password !== formData.confirmPassword}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Request...
              </>
            ) : (
              "Submit Registration Request"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already approved?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
