import BottomNav from '@/components/ui/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0F1E' }}>
      <main
        className="pb-20"
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
