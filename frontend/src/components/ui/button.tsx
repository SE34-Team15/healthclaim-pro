import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 active:scale-[0.99] cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[#0a2540] text-white hover:bg-[#0d3154] shadow-xs focus-visible:ring-[#0a2540]',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-700 shadow-xs focus-visible:ring-rose-500',
        outline:
          'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-950 shadow-2xs focus-visible:ring-slate-400',
        secondary:
          'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400',
        ghost:
          'hover:bg-slate-100 text-slate-700 hover:text-slate-950',
        link:
          'text-[#0a2540] underline-offset-4 hover:underline',
        brand:
          'bg-[#00a88f] text-white hover:bg-[#008f7a] shadow-xs focus-visible:ring-[#00a88f]',
      },
      size: {
        default: 'h-10 px-4 py-2 text-xs',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-8 text-sm',
        icon: 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
