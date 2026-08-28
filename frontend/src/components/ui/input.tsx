import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs ring-offset-white file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-slate-400 hover:bg-white focus:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0a2540] focus-visible:border-[#0a2540] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
