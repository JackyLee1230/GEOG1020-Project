/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-cyan-500 text-slate-950',
        secondary: 'border-transparent bg-slate-200 text-slate-800',
        outline: 'border-slate-300 text-slate-700',
        success: 'border-transparent bg-emerald-200 text-emerald-900',
        warning: 'border-transparent bg-amber-200 text-amber-900',
        danger: 'border-transparent bg-red-200 text-red-900'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
