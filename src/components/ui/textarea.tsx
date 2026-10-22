import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('min-h-28 w-full rounded-xl border border-[#3A241C] bg-[#140C0A] p-3 text-[#F8F0D8]', className)} {...props} />
}
