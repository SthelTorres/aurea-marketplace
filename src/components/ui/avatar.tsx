import * as AvatarPrimitive from '@radix-ui/react-avatar'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Avatar({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Root>) {
  return <AvatarPrimitive.Root className={cn('inline-flex size-10 overflow-hidden rounded-full bg-[#2A1A15]', className)} {...props} />
}
export const AvatarImage = AvatarPrimitive.Image
export function AvatarFallback({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return <AvatarPrimitive.Fallback className={cn('flex size-full items-center justify-center font-semibold text-[#FF9A52]', className)} {...props} />
}
