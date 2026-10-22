import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-50',
  { variants: {
    variant: {
      default: 'bg-[#F26B1D] text-[#1A0C08] hover:bg-[#FF7A1A]',
      outline: 'border border-[#5A3427] bg-transparent text-[#F8F0D8] hover:bg-[#241713]',
      ghost: 'text-[#F8F0D8] hover:bg-[#241713]',
      danger: 'bg-[#8C2F2F] text-[#F8F0D8] hover:bg-[#A33B3B]',
    },
    size: { default: 'h-11 px-5', sm: 'h-9 px-3 text-sm', lg: 'h-12 px-7 text-base', icon: 'size-10' },
  }, defaultVariants: { variant: 'default', size: 'default' } },
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
