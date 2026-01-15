"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, AlertCircle, Clock, Ban, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<{ message: string; type: "error" | "pending" | "banned" | "rejected" } | null>(
    null,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(username, password)
      router.push("/")
    } catch (err: unknown) {
      const apiError = err as { message?: string; status?: number }
      if (apiError.status === 403) {
        const msg = apiError.message?.toLowerCase() || ""
        if (msg.includes("pending")) {
          setError({
            message: "Your account is pending approval. Please wait for an admin to review your application.",
            type: "pending",
          })
        } else if (msg.includes("rejected")) {
          setError({
            message: "Your account application was rejected. Please contact support for more information.",
            type: "rejected",
          })
        } else if (msg.includes("banned")) {
          setError({
            message: "Your account has been banned. Please contact support if you believe this is an error.",
            type: "banned",
          })
        } else {
          setError({
            message: "Access denied. Your account may be pending, rejected, or banned.",
            type: "error",
          })
        }
      } else if (apiError.status === 401) {
        setError({
          message: "Invalid username or password.",
          type: "error",
        })
      } else {
        setError({
          message: apiError.message || "Login failed. Please try again.",
          type: "error",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getErrorIcon = () => {
    switch (error?.type) {
      case "pending":
        return <Clock className="w-4 h-4 shrink-0" />
      case "banned":
        return <Ban className="w-4 h-4 shrink-0" />
      case "rejected":
        return <UserX className="w-4 h-4 shrink-0" />
      default:
        return <AlertCircle className="w-4 h-4 shrink-0" />
    }
  }

  const getErrorStyles = () => {
    switch (error?.type) {
      case "pending":
        return "bg-warning/10 border-warning/30 text-warning"
      case "banned":
        return "bg-destructive/10 border-destructive/30 text-destructive"
      case "rejected":
        return "bg-destructive/10 border-destructive/30 text-destructive"
      default:
        return "bg-destructive/10 border-destructive/30 text-destructive"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center mx-auto mb-4">
            <div className="w-4 h-4 rounded-full bg-success pulse-signal" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <div className="glass rounded-2xl p-6 md:p-8">
          {error && (
            <div className={`flex items-start gap-2 p-3 mb-6 rounded-lg border text-sm ${getErrorStyles()}`}>
              {getErrorIcon()}
              <span>{error.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-12">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link href="/apply-officer" className="text-sm text-muted-foreground hover:text-primary">
              Apply as Traffic Officer
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
