import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex rounded-full border border-[#6A3A25] bg-[#2A160F] px-2.5 py-1 text-xs font-semibold text-[#FF9A52]', className)} {...props} />
}
