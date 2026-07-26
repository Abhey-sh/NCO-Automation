import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface PlaceholderStepProps {
  title: string
  description: string
}

export function PlaceholderStep({ title, description }: PlaceholderStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex min-h-[460px] flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300/80 bg-white/70 px-8 py-12 text-center shadow-[0_25px_80px_-30px_rgba(15,23,42,0.25)] dark:border-slate-700/80 dark:bg-slate-900/70"
    >
      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-3 max-w-xl whitespace-pre-line text-base leading-7 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </motion.div>
  )
}
