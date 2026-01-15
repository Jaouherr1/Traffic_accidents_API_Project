"use client"

import useSWR from "swr"
import { Trophy, Medal, Award, TrendingUp, Crown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getLeaderboard, type LeaderboardEntry } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-6 h-6 text-amber-400" />
    case 2:
      return <Medal className="w-5 h-5 text-gray-300" />
    case 3:
      return <Award className="w-5 h-5 text-amber-600" />
    default:
      return null
  }
}

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/30"
    case 2:
      return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30"
    case 3:
      return "bg-gradient-to-r from-amber-700/20 to-amber-800/10 border-amber-700/30"
    default:
      return "glass"
  }
}

export function Leaderboard() {
  const { user } = useAuth()

  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useSWR("leaderboard", getLeaderboard, {
    refreshInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Could not load leaderboard</h2>
        <p className="text-muted-foreground mt-2">Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning/20 mb-4">
          <Trophy className="w-8 h-8 text-warning" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground mt-2">Top contributors keeping our roads safe</p>
      </div>

      <div className="space-y-3">
        {leaderboardData && leaderboardData.length > 0 ? (
          leaderboardData.map((entry: LeaderboardEntry, index: number) => {
            const isCurrentUser = user?.username === entry.username
            const rankIcon = getRankIcon(entry.rank)

            return (
              <div
                key={entry.user_id || index}
                className={cn(
                  "rounded-xl p-4 border transition-all duration-200 hover:scale-[1.01]",
                  getRankStyle(entry.rank),
                  isCurrentUser && "ring-2 ring-primary/50",
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-background/50">
                    {rankIcon || <span className="text-lg font-bold text-muted-foreground">#{entry.rank}</span>}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-semibold text-foreground", isCurrentUser && "text-primary")}>
                        {entry.username}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points & Trend */}
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-xl font-bold text-warning">{entry.points.toLocaleString()}</span>
                      {entry.rank <= 3 && <TrendingUp className="w-4 h-4 text-success" />}
                    </div>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No leaderboard data available yet. Start reporting incidents to earn points!
          </div>
        )}
      </div>
    </div>
  )
}
