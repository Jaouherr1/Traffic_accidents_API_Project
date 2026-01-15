import { Navbar } from "@/components/navbar"
import { Leaderboard } from "@/components/leaderboard"

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Leaderboard />
      </main>
    </div>
  )
}
