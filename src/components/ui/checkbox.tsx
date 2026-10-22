import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return <CheckboxPrimitive.Root className={cn('flex size-5 items-center justify-center rounded border border-[#6A3A25] data-[state=checked]:bg-[#F26B1D]', className)} {...props}>
    <CheckboxPrimitive.Indicator><Check className="size-4" /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
}
