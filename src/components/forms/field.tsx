import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  const errorId = `${id}-error`
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p id={errorId} className="mt-1 text-sm text-[#FFD0C2]">{error}</p> : null}
    </div>
  )
}
