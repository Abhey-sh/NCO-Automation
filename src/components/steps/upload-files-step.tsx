import { useMemo } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, FileIcon, FileUp, LoaderCircle, XCircle } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { useAppStore, type UploadItem } from '../../store/app-store'
import { cn } from '../../lib/utils'
import { parseKPISheet, parseMembersSheet } from '../../services/excel-parser'

interface UploadFilesStepProps {
  onContinue: () => void
}

const uploadDefinitions = [
  { id: 'kpi-sheet', title: 'KPI Sheet', required: true },
  { id: 'uuid', title: 'UUID', required: true },
  { id: 'members', title: 'Members', required: true },
  { id: 'membership-plan-name', title: 'Membership + Plan Name', required: true },
  { id: 'membership-lookup', title: 'Membership Lookup', required: true },
  { id: 'class-booking', title: 'Class Booking', required: true },
  { id: 'future-membership', title: 'Future Membership', required: false },
]

function getValidationMessage(file: File | null): { status: 'valid' | 'invalid'; message: string } {
  if (!file) {
    return { status: 'invalid', message: 'Awaiting upload' }
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const canRead = file.size > 0
  const hasExtension = extension.length > 0

  if (canRead && hasExtension) {
    return { status: 'valid', message: 'Valid' }
  }

  return { status: 'invalid', message: 'Invalid file' }
}

export function UploadFilesStep({ onContinue }: UploadFilesStepProps) {
  const uploads = useAppStore((state) => state.uploads)
  const setUploadState = useAppStore((state) => state.setUploadState)
  const setStudentNames = useAppStore((state) => state.setStudentNames)
  const setStudentRecords = useAppStore((state) => state.setStudentRecords)
  const setMembers = useAppStore((state) => state.setMembers)
  const setFileData = useAppStore((state) => state.setFileData)

  const requiredUploadsComplete = useMemo(() => {
    return uploads.filter((upload) => upload.required).every((upload) => upload.status === 'valid')
  }, [uploads])

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>, uploadId: string) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    processFileSelection(file, uploadId)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, uploadId: string) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (!file) {
      return
    }

    processFileSelection(file, uploadId)
  }

  const processFileSelection = async (file: File, uploadId: string) => {
    setUploadState(uploadId, {
      filename: file.name,
      status: 'uploading',
      progress: 30,
      message: 'Scanning file...',
    })

    setFileData(uploadId, file)

    try {
      if (uploadId === 'kpi-sheet') {
        const parsed = await parseKPISheet(file)
        setStudentNames(parsed.studentNames)
        setStudentRecords(parsed.studentRecords)
      } else if (uploadId === 'members') {
        const parsed = await parseMembersSheet(file)
        setMembers(parsed.members)
      }

      const validation = getValidationMessage(file)
      setUploadState(uploadId, {
        filename: file.name,
        status: validation.status,
        progress: 100,
        message: validation.message,
      })
    } catch (error) {
      setUploadState(uploadId, {
        filename: file.name,
        status: 'invalid',
        progress: 100,
        message: error instanceof Error ? error.message : 'Failed to parse file',
      })
    }
  }

  const handleRemove = (uploadId: string) => {
    setUploadState(uploadId, {
      filename: '',
      status: 'idle',
      progress: 0,
      message: 'Awaiting upload',
    })

    if (uploadId === 'kpi-sheet') {
      setStudentNames([])
      setStudentRecords([])
    } else if (uploadId === 'members') {
      setMembers([])
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-[32px] border border-slate-200/70 bg-white/70 p-7 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-600">Step 1</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Upload your source files</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Add the required files to start the migration workflow. Validation happens instantly after each file is selected.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            {requiredUploadsComplete ? 'All required files are ready' : 'Awaiting required files'}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-2">
        {uploadDefinitions.map((definition) => {
          const upload = uploads.find((item) => item.id === definition.id) as UploadItem
          const isValid = upload.status === 'valid'
          const isUploading = upload.status === 'uploading'
          const isInvalid = upload.status === 'invalid'

          return (
            <motion.div
              key={definition.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{definition.title}</h3>
                      {definition.required ? (
                        <span className="rounded-full bg-blue-600/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-600">
                          Required
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-600">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{definition.required ? 'Required for migration readiness' : 'This file is optional and will not block progress'}</p>
                  </div>
                </div>
                {isValid ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : isInvalid ? (
                  <XCircle className="h-5 w-5 text-rose-500" />
                ) : null}
              </div>

              <Card className="mt-5 border-dashed border-slate-300/80 bg-slate-50/80 p-4 dark:border-slate-700/80 dark:bg-slate-950/60">
                <CardContent className="space-y-4">
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, definition.id)}
                    className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-4 py-6 text-center shadow-inner transition hover:border-blue-500/60 dark:border-slate-700 dark:bg-slate-900/70"
                  >
                    <div className="space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20">
                        <FileUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Drop or browse for a file</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload a supported source document.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        {upload.filename ? 'Replace file' : 'Browse files'}
                        <input type="file" className="sr-only" onChange={(event) => handleFileSelection(event, definition.id)} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Upload progress</span>
                      <span className="text-slate-500 dark:text-slate-400">{upload.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className={cn('h-full rounded-full transition-all duration-300', isValid ? 'bg-emerald-500' : isUploading ? 'bg-blue-500' : isInvalid ? 'bg-rose-500' : 'bg-slate-400')} style={{ width: `${upload.progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn('font-medium', isValid ? 'text-emerald-600' : isInvalid ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300')}>
                        {upload.status === 'uploading' ? 'Validating...' : upload.message}
                      </span>
                      {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin text-blue-500" /> : null}
                    </div>
                  </div>

                  {upload.filename ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-100">{upload.filename}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={cn('text-xs font-semibold uppercase tracking-[0.25em]', isValid ? 'text-emerald-600' : 'text-rose-500')}>
                          {isValid ? 'Valid' : 'Invalid'}
                        </span>
                        <button className="text-sm font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400" onClick={() => handleRemove(definition.id)}>
                          Remove file
                        </button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button disabled={!requiredUploadsComplete} onClick={onContinue} className="px-7 py-3 text-base">
          Review Mapping <span aria-hidden="true">→</span>
        </Button>
      </div>
    </div>
  )
}
