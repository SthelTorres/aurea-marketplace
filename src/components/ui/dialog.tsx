import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

function DialogFrame({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/70" />
      <DialogPrimitive.Content className={cn('z-50 border border-[#3A241C] bg-[#140C0A] p-6 text-[#F8F0D8] shadow-2xl outline-none', className)} {...props}>
        {children}
        <DialogPrimitive.Close aria-label="Fechar" className="absolute right-4 top-4 rounded-full p-1 text-[#F8F0D8]">
          <X />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogContent({ className, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogFrame className={cn('fixed left-1/2 top-1/2 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl', className)} {...props} />
}

export function DrawerContent({ className, side = 'left', ...props }: ComponentProps<typeof DialogPrimitive.Content> & { side?: 'left' | 'right' }) {
  return (
    <DialogFrame
      className={cn(
        'fixed inset-y-0 flex h-full w-[min(100%,20rem)] flex-col gap-4 overflow-y-auto',
        side === 'left' ? 'left-0' : 'right-0',
        className,
      )}
      {...props}
    />
  )
}
