'use client'

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

export interface PendingResearch {
  leadId: string
  leadName: string
}

interface ResearchContextValue {
  pending: PendingResearch | null
  startResearch: (leadId: string, leadName: string) => void
  clearResearch: () => void
}

const ResearchContext = createContext<ResearchContextValue>({
  pending: null,
  startResearch: () => {},
  clearResearch: () => {},
})

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingResearch | null>(null)

  const startResearch = useCallback((leadId: string, leadName: string) => {
    setPending({ leadId, leadName })
  }, [])

  const clearResearch = useCallback(() => setPending(null), [])

  return (
    <ResearchContext.Provider value={{ pending, startResearch, clearResearch }}>
      {children}
    </ResearchContext.Provider>
  )
}

export const useResearch = () => useContext(ResearchContext)
