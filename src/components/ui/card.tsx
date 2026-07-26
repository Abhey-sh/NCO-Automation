import * as React from 'react'

import { cn } from '../../lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80', className)} {...props} />
))
Card.displayName = 'Card'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-4', className)} {...props} />
))
CardContent.displayName = 'CardContent'

export { Card, CardContent }
