import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ToastProps {
  message: string
  tone?: 'success' | 'error'
}

export function Toast({ message, tone = 'success' }: ToastProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          role="status"
          className="fixed right-6 top-6 z-[120] flex max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
        >
          {tone === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
          )}
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
