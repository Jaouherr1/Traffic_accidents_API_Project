"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Map, Trophy, AlertTriangle, Shield, Menu, X, LogOut, Loader2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

const navLinks = [
  { href: "/", label: "Map", icon: Map },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/report", label: "Report", icon: AlertTriangle },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    setIsLoggingOut(false)
    router.push("/login")
  }

  const getRoleBadgeStyles = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "officer":
        return "bg-primary/20 text-primary border-primary/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full glass">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-success pulse-signal" />
            </div>
          </div>
          <span className="font-semibold text-lg tracking-tight text-foreground">TRAFFIC SYSTEM</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* User Identity Capsule */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-full glass">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground leading-tight">{user.username}</span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border w-fit uppercase",
                        getRoleBadgeStyles(user.role),
                      )}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-warning" />
                  <span className="text-sm font-semibold text-warning">{user.points?.toLocaleString() || 0}</span>
                </div>
              </div>

              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    pathname.startsWith("/admin")
                      ? "bg-amber-500/15 text-amber-400"
                      : "text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10",
                  )}
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-muted-foreground hover:text-destructive"
              >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                asChild
              >
                <Link href="/register-admin">
                  <Shield className="w-4 h-4 mr-1" />
                  Admin
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border glass">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              )
            })}
            {user?.role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/10"
              >
                <Shield className="w-5 h-5" />
                Admin Panel
              </Link>
            )}
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent" asChild>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      Register
                    </Link>
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                  asChild
                >
                  <Link href="/register-admin" onClick={() => setMobileMenuOpen(false)}>
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Registration
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
