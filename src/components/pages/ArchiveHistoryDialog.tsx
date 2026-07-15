'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Clock, History } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface ArchiveEntry {
  id: string
  trigger: string
  delta: Record<string, { old: unknown; new: unknown }> | null
  snapshot: unknown
  version: number
  createdAt: string
}

const TRIGGER_CONFIG: Record<string, { label: string; className: string }> = {
  REPROCESS: {
    label: 'Re Traitement',
    className: 'bg-[#362981]/10 text-[#362981] hover:bg-[#362981]/10 dark:bg-[#362981]/20 dark:text-[#362981]',
  },
  MANUAL_ADJUSTMENT: {
    label: 'Ajustement manuel',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400',
  },
  PROFILE_CHANGE: {
    label: 'Changement de profil',
    className: 'bg-[#029CB1]/10 text-[#029CB1] hover:bg-[#029CB1]/10 dark:bg-[#029CB1]/20 dark:text-[#029CB1]',
  },
}

function formatDeltaValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'number') return val.toLocaleString('fr-FR') + ' FCFA'
  if (typeof val === 'string') return val
  return JSON.stringify(val)
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  payrollLineId: string
  employeeName: string
}

export default function ArchiveHistoryDialog({ open, onOpenChange, payrollLineId, employeeName }: Props) {
  const [archives, setArchives] = useState<ArchiveEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (!open || !payrollLineId) return
    const t = setTimeout(() => {
      setLoading(true)
      api.get<{ data: ArchiveEntry[] }>('/api/payroll/archives', { payrollLineId })
        .then((res) => setArchives(res.data || []))
        .catch(() => setArchives([]))
        .finally(() => setLoading(false))
    }, 0)
    return () => clearTimeout(t)
  }, [open, payrollLineId])

  // Reset expanded on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setExpanded(new Set()), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  const triggerCfg = (trigger: string) =>
    TRIGGER_CONFIG[trigger] || { label: trigger, className: 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400' }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#362981]" />
            Historique des archives
          </DialogTitle>
          <DialogDescription>
            Historique des modifications pour {employeeName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : archives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="mb-2 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucun historique d&apos;archive</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Les modifications apportées à cette ligne de paie apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="relative space-y-0 py-2">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

              {archives.map((entry, idx) => {
                const cfg = triggerCfg(entry.trigger)
                const isOpen = expanded.has(entry.id)
                const delta = entry.delta as Record<string, { old: unknown; new: unknown }> | null

                return (
                  <div key={entry.id} className="relative flex gap-4 py-3">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'relative z-10 mt-1.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-background bg-[#362981]/10',
                        idx === 0 && 'bg-[#362981] text-white'
                      )}
                    >
                      {idx === 0 ? (
                        <span className="text-[10px] font-bold">V{entry.version}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#362981]">V{entry.version}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                        onClick={() => toggle(entry.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="secondary" className={cfg.className}>
                            {cfg.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {formatDate(entry.createdAt)}
                          </span>
                        </div>
                        {delta && Object.keys(delta).length > 0 && (
                          isOpen
                            ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </div>

                      {/* Expanded delta */}
                      {isOpen && delta && Object.keys(delta).length > 0 && (
                        <div className="mt-1 ml-1 rounded-lg border bg-muted/30 p-3 space-y-2">
                          {Object.entries(delta).map(([field, change]) => {
                            const { old: oldVal, new: newVal } = change
                            return (
                              <div key={field} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                                <span className="shrink-0 text-xs font-medium text-muted-foreground min-w-[140px]">
                                  {field}
                                </span>
                                <div className="flex items-center gap-2 text-xs flex-wrap">
                                  <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-red-700 dark:bg-red-950/50 dark:text-red-400">
                                    {formatDeltaValue(oldVal)}
                                  </span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                                    {formatDeltaValue(newVal)}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}