import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('h-11 w-full rounded-xl border border-[#3A241C] bg-[#140C0A] px-3 text-[#F8F0D8] placeholder:text-[#74685E]', className)} {...props} />
}
