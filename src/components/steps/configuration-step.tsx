import { useEffect, useMemo, useState } from 'react'
import { InputMask } from '@react-input/mask'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, CheckCircle2 } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { useAppStore } from '../../store/app-store'
import { cn } from '../../lib/utils'

interface ParsedDate {
  day: number
  month: number
  year: number
}

interface DateFieldProps {
  id: string
  label: string
  value: string
  error: string
  onChange: (value: string) => void
  onBlur: () => void
}

const DATE_FORMAT_ERROR = 'Please enter the date in DD-MM-YYYY format.'
const DEFERRAL_HEADER_TARGETS = [
  'Deferral Date',
  'Membership Deferral Date',
  'Deferred Date',
  'Defer Date',
]
const PRICE_HEADER_TARGETS = [
  'Membership price with discount',
  'Discounted Membership Price',
  'Membership Price',
  'Price with discount',
]

function normalizeHeader(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getSimilarity(leftValue: string, rightValue: string) {
  const left = normalizeHeader(leftValue)
  const right = normalizeHeader(rightValue)
  if (left === right) return 100
  if (!left || !right) return 0

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost,
      )
    }
    previous.splice(0, previous.length, ...current)
  }

  return Math.round(
    (1 - previous[right.length] / Math.max(left.length, right.length)) * 100,
  )
}

function findClosestHeader(headers: string[], targets: string[]) {
  let closestHeader = ''
  let closestScore = -1

  headers.forEach((header) => {
    const score = Math.max(...targets.map((target) => getSimilarity(header, target)))
    if (score > closestScore) {
      closestHeader = header
      closestScore = score
    }
  })

  return closestHeader
}

function parseDisplayDate(value: string): ParsedDate | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const candidate = new Date(Date.UTC(year, month - 1, day))

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null
  }

  return { day, month, year }
}

function formatDisplayDate({ day, month, year }: ParsedDate) {
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`
}

function displayDateToIso(value: string) {
  const parsed = parseDisplayDate(value)
  if (!parsed) return ''

  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`
}

function isoDateToDisplay(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return formatDisplayDate({ day, month, year })
}

function addYears(value: string, years: number) {
  const parsed = parseDisplayDate(value)
  if (!parsed) return ''

  const targetYear = parsed.year + years
  const lastDayOfMonth = new Date(Date.UTC(targetYear, parsed.month, 0)).getUTCDate()
  return formatDisplayDate({ ...parsed, day: Math.min(parsed.day, lastDayOfMonth), year: targetYear })
}

function compareDates(left: string, right: string) {
  const leftDate = parseDisplayDate(left)
  const rightDate = parseDisplayDate(right)
  if (!leftDate || !rightDate) return 0

  const leftValue = leftDate.year * 10000 + leftDate.month * 100 + leftDate.day
  const rightValue = rightDate.year * 10000 + rightDate.month * 100 + rightDate.day
  return leftValue - rightValue
}

function getDateError(value: string) {
  if (!value) return 'This field is required'
  return parseDisplayDate(value) ? '' : DATE_FORMAT_ERROR
}

function DateField({ id, label, value, error, onChange, onBlur }: DateFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const visibleFieldError = isFocused ? '' : error

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-900 dark:text-white">
        {label}
        <span className="ml-1 text-red-500">*</span>
      </label>
      <div className="relative">
        <InputMask
          component={Input}
          mask="__-__-____"
          replacement={{ _: /\d/ }}
          track={({ inputType, data }) =>
            inputType === 'insert' && data ? data.replace(/\D/g, '') : undefined
          }
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false)
            onBlur()
          }}
          placeholder="DD-MM-YYYY"
          aria-invalid={Boolean(visibleFieldError)}
          aria-describedby={visibleFieldError ? `${id}-error` : undefined}
          className={cn(
            'pr-12',
            visibleFieldError
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800'
              : '',
          )}
        />
        <div className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2">
          <Calendar className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={displayDateToIso(value)}
            onChange={(event) => {
              if (event.target.value) onChange(isoDateToDisplay(event.target.value))
            }}
            aria-label={`Open ${label} calendar`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
      {visibleFieldError ? (
        <p id={`${id}-error`} className="text-xs font-medium text-rose-500 dark:text-rose-400">
          {visibleFieldError}
        </p>
      ) : null}
    </div>
  )
}

export function ConfigurationStep() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep)
  const configurationState = useAppStore((state) => state.configurationState)
  const setConfigurationState = useAppStore((state) => state.setConfigurationState)
  const studentRecords = useAppStore((state) => state.studentRecords)

  const {
    studioId = '',
    cycleStartDate,
    nextPaymentDate,
    deferralDateHeader = 'Deferral Date',
    membershipPriceHeader = 'Membership price with discount',
    bookStartDateTime,
    bookUntilDateTime,
  } = configurationState
  const kpiHeaders = useMemo(
    () =>
      Array.from(
        new Set(
          studentRecords.flatMap((record) => Object.keys(record.values ?? {})),
        ),
      ),
    [studentRecords],
  )
  const suggestedDeferralHeader = useMemo(
    () => findClosestHeader(kpiHeaders, DEFERRAL_HEADER_TARGETS),
    [kpiHeaders],
  )
  const suggestedPriceHeader = useMemo(
    () => findClosestHeader(kpiHeaders, PRICE_HEADER_TARGETS),
    [kpiHeaders],
  )

  useEffect(() => {
    if (kpiHeaders.length === 0) return

    const updates: Partial<typeof configurationState> = {}
    if (!kpiHeaders.includes(deferralDateHeader) && suggestedDeferralHeader) {
      updates.deferralDateHeader = suggestedDeferralHeader
    }
    if (!kpiHeaders.includes(membershipPriceHeader) && suggestedPriceHeader) {
      updates.membershipPriceHeader = suggestedPriceHeader
    }
    if (Object.keys(updates).length > 0) {
      setConfigurationState(updates)
    }
  }, [
    configurationState,
    deferralDateHeader,
    kpiHeaders,
    membershipPriceHeader,
    setConfigurationState,
    suggestedDeferralHeader,
    suggestedPriceHeader,
  ])

  const errors = {
    studioId: studioId.trim() ? '' : 'This field is required',
    cycleStartDate: getDateError(cycleStartDate),
    nextPaymentDate: getDateError(nextPaymentDate),
    deferralDateHeader: deferralDateHeader.trim() ? '' : 'This field is required',
    membershipPriceHeader: membershipPriceHeader.trim() ? '' : 'This field is required',
    bookStartDate: getDateError(bookStartDateTime),
    bookUntilDate: getDateError(bookUntilDateTime),
  }
  const bookUntilOrderError =
    !errors.bookStartDate && !errors.bookUntilDate && compareDates(bookUntilDateTime, bookStartDateTime) < 0
      ? 'Book Until Date cannot be earlier than Book Start Date.'
      : ''
  const isFormValid = Object.values(errors).every((error) => !error) && !bookUntilOrderError
  const [touchedFields, setTouchedFields] = useState<Record<keyof typeof errors, boolean>>({
    studioId: false,
    cycleStartDate: false,
    nextPaymentDate: false,
    deferralDateHeader: false,
    membershipPriceHeader: false,
    bookStartDate: false,
    bookUntilDate: false,
  })
  const [continueAttempted, setContinueAttempted] = useState(false)

  const markFieldTouched = (field: keyof typeof errors) => {
    setTouchedFields((current) => ({ ...current, [field]: true }))
  }

  const visibleError = (field: keyof typeof errors, additionalError = '') =>
    touchedFields[field] || continueAttempted ? errors[field] || additionalError : ''

  const handleBookStartDateChange = (value: string) => {
    const calculatedBookUntilDate = addYears(value, 2)
    setConfigurationState({
      bookStartDateTime: value,
      ...(calculatedBookUntilDate ? { bookUntilDateTime: calculatedBookUntilDate } : {}),
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-6">
      <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-7 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-600">Step 3</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Configuration</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Provide the migration settings required before generating the import files.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Calendar className="h-4 w-4 text-blue-600" />
            Configuration mode
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Card className="rounded-[28px] border-slate-200/70 dark:border-slate-800/80">
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <label htmlFor="studio-id" className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Studio ID
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <Input
                  id="studio-id"
                  value={studioId}
                  onChange={(event) => setConfigurationState({ studioId: event.target.value })}
                  onBlur={() => markFieldTouched('studioId')}
                  placeholder="Enter Studio ID"
                  aria-invalid={Boolean(visibleError('studioId'))}
                  aria-describedby={visibleError('studioId') ? 'studio-id-error' : undefined}
                  className={visibleError('studioId') ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800' : ''}
                />
                {visibleError('studioId') ? (
                  <p id="studio-id-error" className="text-xs font-medium text-rose-500 dark:text-rose-400">
                    {visibleError('studioId')}
                  </p>
                ) : null}
              </div>
              <DateField
                id="cycle-start-date"
                label="Cycle Start Date"
                value={cycleStartDate}
                error={visibleError('cycleStartDate')}
                onChange={(value) => setConfigurationState({ cycleStartDate: value })}
                onBlur={() => markFieldTouched('cycleStartDate')}
              />
              <DateField
                id="next-payment-date"
                label="Next Payment Date"
                value={nextPaymentDate}
                error={visibleError('nextPaymentDate')}
                onChange={(value) => setConfigurationState({ nextPaymentDate: value })}
                onBlur={() => markFieldTouched('nextPaymentDate')}
              />
              <div className="space-y-2">
                <label htmlFor="deferral-date-header" className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Deferral Date Header
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  id="deferral-date-header"
                  value={deferralDateHeader}
                  onChange={(event) =>
                    setConfigurationState({ deferralDateHeader: event.target.value })
                  }
                  onBlur={() => markFieldTouched('deferralDateHeader')}
                  aria-invalid={Boolean(visibleError('deferralDateHeader'))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  disabled={kpiHeaders.length === 0}
                >
                  {kpiHeaders.length === 0 ? (
                    <option value={deferralDateHeader}>No KPI headers found</option>
                  ) : null}
                  {kpiHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Closest matching KPI header is selected automatically. Choose another column if needed.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="membership-price-header" className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Deferral Membership Price Header
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  id="membership-price-header"
                  value={membershipPriceHeader}
                  onChange={(event) =>
                    setConfigurationState({ membershipPriceHeader: event.target.value })
                  }
                  onBlur={() => markFieldTouched('membershipPriceHeader')}
                  aria-invalid={Boolean(visibleError('membershipPriceHeader'))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  disabled={kpiHeaders.length === 0}
                >
                  {kpiHeaders.length === 0 ? (
                    <option value={membershipPriceHeader}>No KPI headers found</option>
                  ) : null}
                  {kpiHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Closest matching KPI header is selected automatically. Choose another column if needed.
                </p>
              </div>
              <DateField
                id="book-start-date"
                label="Book Start Date"
                value={bookStartDateTime}
                error={visibleError('bookStartDate')}
                onChange={handleBookStartDateChange}
                onBlur={() => markFieldTouched('bookStartDate')}
              />
              <DateField
                id="book-until-date"
                label="Book Until Date"
                value={bookUntilDateTime}
                error={visibleError('bookUntilDate', bookUntilOrderError)}
                onChange={(value) => setConfigurationState({ bookUntilDateTime: value })}
                onBlur={() => markFieldTouched('bookUntilDate')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-1">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="overflow-hidden rounded-[28px] border-slate-200/70 dark:border-slate-800/80 sticky top-6">
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-cyan-500" />
              <CardContent className="space-y-5 pt-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Migration Configuration</p>
                </div>

                <div className="space-y-4">
                  <div className={cn('rounded-xl p-3 transition', studioId ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20')}>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Studio ID</p>
                    <p className={cn('mt-2 text-sm font-semibold', studioId ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>
                      {studioId || '—'}
                    </p>
                  </div>
                  {/* Cycle Start Date Preview */}
                  <div className={cn('rounded-xl p-3 transition', cycleStartDate ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20')}>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Cycle Start Date</p>
                    <p className={cn('mt-2 text-sm font-semibold', cycleStartDate ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>
                      {cycleStartDate || '—'}
                    </p>
                  </div>

                  {/* Next Payment Date Preview */}
                  <div className={cn('rounded-xl p-3 transition', nextPaymentDate ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20')}>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Next Payment Date</p>
                    <p className={cn('mt-2 text-sm font-semibold', nextPaymentDate ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>
                      {nextPaymentDate || '—'}
                    </p>
                  </div>

                  {/* Book Start Preview */}
                  <div className={cn('rounded-xl p-3 transition', bookStartDateTime ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20')}>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Book Start Date</p>
                    <p className={cn('mt-2 text-sm font-semibold', bookStartDateTime ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>
                      {bookStartDateTime || '—'}
                    </p>
                  </div>

                  {/* Book Until Preview */}
                  <div className={cn('rounded-xl p-3 transition', bookUntilDateTime ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20')}>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Book Until Date</p>
                    <p className={cn('mt-2 text-sm font-semibold', bookUntilDateTime ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>
                      {bookUntilDateTime || '—'}
                    </p>
                  </div>
                </div>

                {/* Validation Status */}
                <div className={cn('rounded-xl p-3 transition', isFormValid ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-rose-50/50 dark:bg-rose-950/20')}>
                  <div className="flex items-center gap-2">
                    {isFormValid ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All fields complete</span>
                      </>
                    ) : (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                        <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">Awaiting input</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="secondary" onClick={() => setCurrentStep(2)} className="px-6 py-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div onClick={() => {
          if (!isFormValid) setContinueAttempted(true)
        }}>
          <Button onClick={() => setCurrentStep(4)} disabled={!isFormValid} className="px-7 py-3 text-base">
            Continue <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
