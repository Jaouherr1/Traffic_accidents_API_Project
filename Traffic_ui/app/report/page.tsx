import { Navbar } from "@/components/navbar"
import { ReportWizard } from "@/components/report-wizard"

export default function ReportPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <ReportWizard />
      </main>
    </div>
  )
}
