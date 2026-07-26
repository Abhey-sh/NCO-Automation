import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, FileSpreadsheet, LoaderCircle, Play, Rows3 } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Toast } from '../ui/toast'
import { ImportPreviewTable } from './import-preview-table'
import { createCsv, downloadCsv, type CsvColumn } from '../../lib/csv'
import { generateAccountMetadata } from '../../services/import-service'
import { useAppStore } from '../../store/app-store'
import type { AccountMetadataRow } from '../../types/imports'

const accountMetadataColumns: CsvColumn<AccountMetadataRow>[] = [
  { key: 'userForeignId', header: 'userForeignId' },
  { key: 'studioForeignId', header: 'studioForeignId' },
  { key: 'studioId', header: 'studioId' },
  { key: 'email', header: 'email' },
]

export function AccountMetadataCard() {
  const studioId = useAppStore((state) => state.configurationState.studioId ?? '')
  const reviewedMappings = useAppStore((state) => state.reviewedMappings)
  const rows = useAppStore((state) => state.accountMetadataRows)
  const setRows = useAppStore((state) => state.setAccountMetadataRows)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    if (!toastMessage) return
    const timeout = window.setTimeout(() => setToastMessage(''), 3000)
    return () => window.clearTimeout(timeout)
  }, [toastMessage])

  const handleGenerate = async () => {
    const normalizedStudioId = studioId.trim()
    if (!normalizedStudioId) {
      setError('Studio ID is required before generating Account Metadata.')
      return
    }

    if (reviewedMappings.length === 0) {
      setError('No matched students available.')
      return
    }

    setError('')
    setIsGenerating(true)

    try {
      const generatedRows = await generateAccountMetadata({
        studioId: normalizedStudioId,
        mappings: reviewedMappings,
      })
      setRows(generatedRows)
      setToastMessage(`Account Metadata generated successfully: ${generatedRows.length} rows.`)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Import generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (rows.length === 0) {
      setError('No matched students available.')
      return
    }

    const csv = createCsv(rows, accountMetadataColumns)
    downloadCsv('account_metadata.csv', csv)
  }

  return (
    <>
      <Toast message={toastMessage} />
      <Card className="overflow-hidden rounded-[28px] border-slate-200/70 dark:border-slate-800/80">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-cyan-500" />
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-blue-600 dark:border-slate-700 dark:bg-slate-800">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Account Metadata</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Generate account metadata from the completed Review Mapping results.
                </p>
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="shrink-0">
              {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300"
            >
              {error}
            </motion.div>
          ) : null}

          {rows.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Rows3 className="h-4 w-4 text-emerald-500" />
                  Generated: {rows.length} rows
                  {rows.length > 50 ? <span className="font-normal text-slate-500">(showing first 50)</span> : null}
                </div>
                <Button variant="secondary" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              </div>
              <ImportPreviewTable rows={rows} columns={accountMetadataColumns} />
            </motion.div>
          ) : null}
        </CardContent>
      </Card>
    </>
  )
}
