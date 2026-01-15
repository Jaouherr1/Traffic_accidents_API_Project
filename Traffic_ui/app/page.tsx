import { Navbar } from "@/components/navbar"
import { CommandMap } from "@/components/command-map"

// Navbar now uses auth context
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative">
        <CommandMap />
      </main>
    </div>
  )
}
