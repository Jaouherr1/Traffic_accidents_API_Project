"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import {
  login as apiLogin,
  logout as apiLogout,
  getProfile,
  refreshToken,
  type User,
  type LoginResponse,
} from "@/lib/api"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile()
      setUser(profile)
    } catch (error) {
      // Try to refresh token
      try {
        const { access_token } = await refreshToken()
        localStorage.setItem("access_token", access_token)
        const profile = await getProfile()
        setUser(profile)
      } catch {
        // Clear tokens if refresh fails
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token")
      if (token) {
        await refreshUser()
      }
      setIsLoading(false)
    }
    initAuth()
  }, [refreshUser])

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiLogin(username, password)
    localStorage.setItem("access_token", response.access_token)
    localStorage.setItem("refresh_token", response.refresh_token)
    await refreshUser()
    return response
  }

  const logout = async () => {
    try {
      await apiLogout()
    } finally {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
