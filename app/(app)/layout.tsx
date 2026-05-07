import BottomNav from '@/components/ui/bottom-nav'
import { ResearchProvider } from '@/components/ui/research-context'
import ResearchBanner from '@/components/ui/research-banner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ResearchProvider>
      <div className="min-h-screen" style={{ backgroundColor: '#0A0F1E' }}>
        <ResearchBanner />
        <main style={{ paddingBottom: 'calc(76px + env(safe-area-inset-bottom))' }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </ResearchProvider>
  )
}
