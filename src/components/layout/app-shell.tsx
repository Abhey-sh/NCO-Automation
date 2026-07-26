import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Moon, Settings, Sun, UserCircle2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { UploadFilesStep } from '../steps/upload-files-step'
import { ReviewMappingStep } from '../steps/review-mapping-step'
import { ConfigurationStep } from '../steps/configuration-step'
import { GenerateOutputsStep } from '../steps/generate-outputs-step'
import { Button } from '../ui/button'
import { useAppStore } from '../../store/app-store'
import logo from '../../assets/logo.png'
import logoDark from '../../assets/logo_dark.png'

const steps = [
  { id: 1, title: 'Upload Files' },
  { id: 2, title: 'Review Mapping' },
  { id: 3, title: 'Configuration' },
  { id: 4, title: 'Generate Outputs' },
]

export function AppShell() {
  const theme = useAppStore((state) => state.theme)
  const currentStep = useAppStore((state) => state.currentStep)
  const uploads = useAppStore((state) => state.uploads)
  const toggleTheme = useAppStore((state) => state.toggleTheme)
  const setCurrentStep = useAppStore((state) => state.setCurrentStep)
  const completeStepOne = useAppStore((state) => state.completeStepOne)

  const currentTitle = useMemo(() => steps.find((step) => step.id === currentStep)?.title ?? 'Upload Files', [currentStep])
  const requiredUploadsComplete = useMemo(
    () => uploads.filter((upload) => upload.required).every((upload) => upload.status === 'valid'),
    [uploads],
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    if (currentStep > 1 && !requiredUploadsComplete) {
      setCurrentStep(1)
    }
  }, [currentStep, requiredUploadsComplete, setCurrentStep])

  const getStepState = (index: number) => {
    if (index < currentStep) return 'completed'
    if (index === currentStep) return 'active'
    return 'pending'
  }

  const handleContinue = () => {
    if (requiredUploadsComplete) {
      completeStepOne()
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <UploadFilesStep onContinue={handleContinue} />
      case 2:
        return <ReviewMappingStep />
      case 3:
        return <ConfigurationStep />
      case 4:
        return <GenerateOutputsStep />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(135deg,_#f8fbff_0%,_#f4f7fb_100%)] text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_24%),linear-gradient(135deg,_#040816_0%,_#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 lg:px-6 lg:py-6">
        <header className="mb-4 flex items-center justify-between rounded-[28px] border border-white/60 bg-white/70 px-5 py-4 shadow-[0_20px_70px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <img src={theme === 'dark' ? logoDark : logo} alt="NCO Automation Studio logo" className="h-10 w-10 rounded-2xl object-cover" />
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">NCO Automation Studio</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Enterprise migration workspace</p>
            </div>
          </div>

          <div className="hidden text-center md:block">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{currentTitle}</p>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Wizard progress</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle color theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Open settings">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <UserCircle2 className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Admin</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 lg:flex-row">
          <aside className="w-full shrink-0 rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-[0_20px_70px_-35px_rgba(15,23,42,0.3)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70 lg:w-80">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Workflow</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Migration Studio</h2>
              </div>
              <div className="rounded-full bg-blue-600/10 p-2 text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="relative space-y-3">
              <div className="absolute left-[19px] top-2 h-[calc(100%-16px)] w-px bg-slate-200 dark:bg-slate-700" />
              {steps.map((step) => {
                const state = getStepState(step.id)
                const isClickable = state === 'completed' || state === 'active'

                return (
                  <motion.button
                    key={step.id}
                    whileHover={isClickable ? { x: 3, scale: 1.01 } : undefined}
                    onClick={() => {
                      if (isClickable) {
                        setCurrentStep(step.id)
                      }
                    }}
                    className={`group relative z-10 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${state === 'active'
                      ? 'border-blue-500/40 bg-blue-600/10 shadow-[0_10px_30px_-15px_rgba(37,99,235,0.45)]'
                      : state === 'completed'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-slate-700 dark:text-slate-200'
                        : 'border-slate-200 bg-white/70 text-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-500'} ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${state === 'active' ? 'bg-blue-600 text-white' : state === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {state === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{step.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{step.id === 1 ? 'Upload source files' : step.id === 2 ? 'Review mappings' : step.id === 3 ? 'Set migration options' : 'Generate deliverables'}</p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </aside>

          <main className="min-w-0 flex-1 rounded-[32px] border border-white/60 bg-white/55 p-4 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/55 lg:p-7">
            <AnimatePresence mode="wait">
              <motion.div key={currentStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  )
}
