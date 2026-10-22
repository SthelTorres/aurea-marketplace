import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value
export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return <SelectPrimitive.Trigger className={cn('flex h-11 w-full items-center justify-between rounded-xl border border-[#3A241C] bg-[#140C0A] px-3', className)} {...props}>{children}<SelectPrimitive.Icon><ChevronDown className="size-4" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>
}
export function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return <SelectPrimitive.Portal><SelectPrimitive.Content position="popper" className={cn('z-50 min-w-[var(--radix-select-trigger-width)] rounded-xl border border-[#3A241C] bg-[#1B100D] p-1 shadow-xl', className)} {...props}><SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>
}
export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return <SelectPrimitive.Item className={cn('relative flex cursor-pointer items-center rounded-lg py-2 pl-8 pr-3 outline-none data-[highlighted]:bg-[#382017]', className)} {...props}><span className="absolute left-2"><SelectPrimitive.ItemIndicator><Check className="size-4" /></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>
}
