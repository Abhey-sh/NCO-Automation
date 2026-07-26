import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Phone, Search, Sparkles, UserCheck2, XCircle } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { buildReviewMappingRows, computeSimilarity, type ReviewMappingRow } from '../../services/review-mapping'
import { useAppStore } from '../../store/app-store'
import type { Member } from '../../services/excel-parser'
import { cn } from '../../lib/utils'

const filterOptions = ['All', 'Matched', 'Not Matched'] as const

type FilterValue = (typeof filterOptions)[number]

function getSuggestionRank(member: Member, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const fullName = `${member.firstName} ${member.lastName}`.trim().toLowerCase()
  const firstName = member.firstName.toLowerCase()
  const lastName = member.lastName.toLowerCase()

  if (fullName === normalizedQuery) return 0
  if (fullName.startsWith(normalizedQuery)) return 1
  if (firstName.startsWith(normalizedQuery) || lastName.startsWith(normalizedQuery)) return 2
  return 3
}

export function ReviewMappingStep() {
  const studentRecords = useAppStore((state) => state.studentRecords)
  const studentNames = useAppStore((state) => state.studentNames)
  const members = useAppStore((state) => state.members)
  const setCurrentStep = useAppStore((state) => state.setCurrentStep)
  const setMemberNotFound = useAppStore((state) => state.setMemberNotFound)
  const setReviewedMappings = useAppStore((state) => state.setReviewedMappings)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterValue>('All')
  const [rows, setRows] = useState<ReviewMappingRow[]>([])
  const [activeStudent, setActiveStudent] = useState<string | null>(null)
  const [dropdownPlacement, setDropdownPlacement] = useState({
    direction: 'down' as 'up' | 'down',
    top: 0,
    left: 0,
    width: 380,
    maxHeight: 0,
    ready: false,
  })
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const activeInputRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLUListElement>(null)

  const baseRecords = useMemo(() => {
    if (studentRecords.length > 0) {
      return studentRecords
    }

    return studentNames.map((studentName) => ({ studentName, phoneNumber: '' }))
  }, [studentRecords, studentNames])

  const assignedMappings = useAppStore((state) => state.assignedMappings)
  const setAssignedMapping = useAppStore((state) => state.setAssignedMapping)

  useEffect(() => {
    const computed = buildReviewMappingRows(baseRecords, members)

    // Apply persisted assigned mappings so manual assignments survive reloads
    const mapped = computed.map((r) => {
      const mapping = assignedMappings[r.studentName]
      if (!mapping) return r

      return {
        ...r,
        matched: true,
        matchedMember: mapping.matchedMember,
        email: mapping.email,
        suggestedMember: mapping.matchedMember,
        suggestedEmail: mapping.email,
        similarity: 100,
        manualAssignmentState: 'assigned' as const,
        draftQuery: mapping.matchedMember,
      }
    })

    setRows(mapped)
  }, [baseRecords, members, assignedMappings, setAssignedMapping])

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesFilter =
        filter === 'All' || (filter === 'Matched' && row.matched === true) || (filter === 'Not Matched' && row.matched === false)

      const searchableText = `${row.studentName} ${row.matchedMember} ${row.email} ${row.suggestedMember} ${row.suggestedEmail} ${row.phoneNumber}`.toLowerCase()
      const matchesQuery = normalizedQuery.length === 0 || searchableText.includes(normalizedQuery)

      return matchesFilter && matchesQuery
    })
  }, [filter, query, rows])

  const summary = useMemo(() => {
    const total = rows.length
    const matched = rows.filter((row) => row.matched).length
    const notMatched = total - matched
    const completion = total === 0 ? 0 : Math.round((matched / total) * 100)

    return { total, matched, notMatched, completion }
  }, [rows])

  useLayoutEffect(() => {
    if (filter !== 'Not Matched' || !activeStudent) return

    const updatePlacement = () => {
      const tableContainer = tableContainerRef.current
      const inputContainer = activeInputRef.current
      const dropdown = dropdownRef.current
      if (!tableContainer || !inputContainer || !dropdown) return

      const containerRect = tableContainer.getBoundingClientRect()
      const inputRect = inputContainer.getBoundingClientRect()
      const spacing = 8
      const visibleTop = Math.max(containerRect.top, spacing)
      const visibleBottom = Math.min(containerRect.bottom, window.innerHeight - spacing)
      const availableBelow = Math.max(0, visibleBottom - inputRect.bottom - spacing)
      const availableAbove = Math.max(0, inputRect.top - visibleTop - spacing)
      const naturalHeight = dropdown.scrollHeight
      const direction = availableBelow >= naturalHeight ? 'down' : 'up'
      const availableHeight = direction === 'down' ? availableBelow : availableAbove
      const maxHeight = Math.min(naturalHeight, availableHeight)
      const width = Math.min(380, containerRect.width - 24, window.innerWidth - 24)
      const leftBoundary = Math.max(12, containerRect.left + 12)
      const rightBoundary = Math.min(window.innerWidth - 12, containerRect.right - 12)
      const left = Math.max(leftBoundary, Math.min(inputRect.left, rightBoundary - width))
      const top = direction === 'down'
        ? inputRect.bottom + spacing
        : inputRect.top - spacing - maxHeight

      setDropdownPlacement({ direction, top, left, width, maxHeight, ready: true })
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)

    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [activeStudent, filter, members, rows])

  const handleDraftChange = (studentName: string, value: string) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.studentName === studentName
          ? {
              ...row,
              draftQuery: value,
              suggestedMember: '',
              suggestedEmail: '',
              similarity: 0,
              manualAssignmentState: 'idle',
            }
          : row,
      ),
    )
  }

  const handleSuggestionSelect = (studentName: string, member: Member) => {
    const displayName = `${member.firstName} ${member.lastName}`.trim()

    setRows((currentRows) =>
      currentRows.map((row) =>
        row.studentName === studentName
          ? {
              ...row,
              suggestedMember: displayName,
              suggestedEmail: member.email,
              similarity: computeSimilarity(row.studentName, displayName),
              draftQuery: displayName,
              manualAssignmentState: 'ready',
            }
          : row,
      ),
    )
    setActiveStudent(null)
  }

  const getRowSuggestions = (draftQuery: string) =>
    draftQuery.trim().length > 0
      ? members
          .filter((member) => {
            const fullName = `${member.firstName} ${member.lastName}`.trim().toLowerCase()
            return fullName.includes(draftQuery.trim().toLowerCase())
          })
          .sort((left, right) => getSuggestionRank(left, draftQuery) - getSuggestionRank(right, draftQuery))
      : []

  const handleAssignAll = () => {
    const updatedRows: ReviewMappingRow[] = rows.map((row) => {
      if (row.matched) return row

      const suggestions = getRowSuggestions(row.draftQuery)
      const candidate = row.suggestedMember
        ? { matchedMember: row.suggestedMember, email: row.suggestedEmail }
        : suggestions.length > 0
        ? {
            matchedMember: `${suggestions[0].firstName} ${suggestions[0].lastName}`.trim(),
            email: suggestions[0].email,
          }
        : null

      if (!candidate) return row

      return {
        ...row,
        matched: true,
        matchedMember: candidate.matchedMember,
        email: candidate.email,
        suggestedMember: row.suggestedMember || candidate.matchedMember,
        suggestedEmail: row.suggestedEmail || candidate.email,
        manualAssignmentState: 'assigned',
      } as ReviewMappingRow
    })

    updatedRows.forEach((row) => {
      if (row.matched && row.manualAssignmentState === 'assigned') {
        setAssignedMapping(row.studentName, { matchedMember: row.matchedMember, email: row.email })
      }
    })

    setRows(updatedRows)
    setActiveStudent(null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, studentName: string, suggestions: Member[]) => {
    if (!suggestions.length) return

    if (event.key === 'Enter') {
      event.preventDefault()
      handleSuggestionSelect(studentName, suggestions[0])
    }
  }

  const handleContinue = () => {
    const notMatched = rows.filter((row) => !row.matched).map((row) => ({ studentName: row.studentName, phoneNumber: row.phoneNumber }))
    const matchedMappings = rows
      .filter((row) => row.matched && row.email && row.email !== '—')
      .map((row) => ({
        studentName: row.studentName,
        matchedMember: row.matchedMember,
        email: row.email,
        matchType: assignedMappings[row.studentName] ? 'manual' as const : 'exact' as const,
      }))

    setMemberNotFound(notMatched)
    setReviewedMappings(matchedMappings)
    setCurrentStep(3)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="min-w-0 space-y-6">
      <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-7 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-600">Step 2</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Review Student Email Mapping</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Review exact matches and finish any unmatched students manually with fast member suggestions.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Manual review mode
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Students', value: summary.total, accent: 'from-blue-600 to-cyan-500' },
          { label: 'Matched', value: summary.matched, accent: 'from-emerald-500 to-green-500' },
          { label: 'Not Matched', value: summary.notMatched, accent: 'from-rose-500 to-orange-500' },
          { label: 'Completion %', value: `${summary.completion}%`, accent: 'from-violet-500 to-fuchsia-500' },
        ].map((card) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <Card className="overflow-hidden rounded-[24px] border-slate-200/70 dark:border-slate-800/80">
              <div className={`h-1.5 w-full bg-gradient-to-r ${card.accent}`} />
              <CardContent className="pt-4 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{card.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card ref={tableContainerRef} className="box-border w-full max-w-full rounded-[28px] border-slate-200/70 dark:border-slate-800/80">
        <CardContent className="min-w-0 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between xl:flex-nowrap">
            <div className="flex min-w-0 flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setFilter(option)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-sm font-semibold transition',
                    filter === option
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full min-w-[220px] max-w-[380px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search students, members, phones"
                  className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                {filter === 'Not Matched' ? (
                  <Button size="sm" className="min-w-[170px]" onClick={handleAssignAll} disabled={!rows.some((row) => !row.matched && (row.suggestedMember || getRowSuggestions(row.draftQuery).length > 0))}>
                    Assign suggestions
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setCurrentStep(1)}>
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button size="sm" onClick={handleContinue}>
                      Continue <span aria-hidden="true">→</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="box-border w-full max-w-full overflow-hidden rounded-[24px] border border-slate-200/80 dark:border-slate-800/80">
            <div
              className={cn(
                'w-full max-w-full',
                filter === 'Not Matched'
                  ? 'overflow-x-auto'
                  : 'mapping-table-scroll h-[clamp(320px,calc(100vh-420px),600px)] overflow-auto',
              )}
            >
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className={cn('bg-slate-50/90 dark:bg-slate-900/80', filter !== 'Not Matched' && 'sticky top-0 z-10')}>
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Status</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Student Name</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Phone</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Suggested Member</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Email</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Similarity</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/70">
                  {visibleRows.map((row, index) => {
                    const suggestions = row.draftQuery.trim().length > 0
                      ? members
                          .filter((member) => {
                            const fullName = `${member.firstName} ${member.lastName}`.trim().toLowerCase()
                            return fullName.includes(row.draftQuery.trim().toLowerCase())
                          })
                          .sort((left, right) => getSuggestionRank(left, row.draftQuery) - getSuggestionRank(right, row.draftQuery))
                      : []
                    const showSuggestionsAbove = index >= visibleRows.length - 3
                    const suggestionOptions = suggestions.map((member) => {
                      const suggestionLabel = `${member.firstName} ${member.lastName}`.trim()
                      const suggestionKey = `${suggestionLabel}-${member.email}`
                      return (
                        <li
                          key={suggestionKey}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSuggestionSelect(row.studentName, member)}
                          className="cursor-pointer border-b border-slate-100 px-3 py-2 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                        >
                          <div className="font-medium text-slate-800 dark:text-slate-100">{suggestionLabel}</div>
                          <div className="mt-0.5 break-all text-xs text-slate-500 dark:text-slate-400">{member.email}</div>
                        </li>
                      )
                    })

                    return (
                      <tr
                        key={`${row.studentName}-${index}`}
                        className={cn(row.matched ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20')}
                      >
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700 dark:text-slate-200">
                            {row.matched ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                            <span>
                              {row.matched ? 'Matched' : row.manualAssignmentState === 'ready' ? 'Ready to assign' : 'Not matched'}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-100">{row.studentName}</td>
                        <td className="px-2 py-2 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span>{row.phoneNumber || '—'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {row.matched ? (
                            <span className="font-medium text-slate-800 dark:text-slate-100">{row.matchedMember}</span>
                          ) : (
                            <div ref={activeStudent === row.studentName ? activeInputRef : null} className="relative">
                              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                <Search className="h-4 w-4 text-slate-400" />
                                  <input
                                    value={row.draftQuery}
                                    onChange={(event) => handleDraftChange(row.studentName, event.target.value)}
                                    onFocus={() => setActiveStudent(row.studentName)}
                                    onBlur={() => setActiveStudent(null)}
                                    onKeyDown={(event) => handleKeyDown(event, row.studentName, suggestions)}
                                    placeholder="Search by first or last name"
                                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                  />
                              </div>
                              {suggestions.length > 0 && row.draftQuery.trim().length > 0 && activeStudent === row.studentName ? (
                                filter === 'Not Matched' && typeof document !== 'undefined' ? (
                                  createPortal(
                                    <motion.ul
                                      key={`${row.studentName}-${dropdownPlacement.direction}`}
                                      ref={dropdownRef}
                                      initial={{ opacity: 0, y: dropdownPlacement.direction === 'down' ? -6 : 6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.18 }}
                                      className="fixed z-[100] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950"
                                      style={{
                                        top: dropdownPlacement.top,
                                        left: dropdownPlacement.left,
                                        width: dropdownPlacement.width,
                                        maxHeight: dropdownPlacement.maxHeight,
                                        visibility: dropdownPlacement.ready ? 'visible' : 'hidden',
                                      }}
                                    >
                                      {suggestionOptions}
                                    </motion.ul>,
                                    document.body,
                                  )
                                ) : (
                                  <ul
                                    className={cn(
                                      'absolute z-30 w-[380px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950',
                                      showSuggestionsAbove ? 'bottom-full mb-2' : 'top-full mt-2',
                                    )}
                                  >
                                    {suggestionOptions}
                                  </ul>
                                )
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-sm text-slate-600 dark:text-slate-300">
                          {row.matched ? row.email : row.suggestedEmail ? row.suggestedEmail : '—'}
                        </td>
                        <td className="px-2 py-2 text-sm text-slate-600 dark:text-slate-300">
                          {row.matched ? '100%' : row.similarity > 0 ? `${row.similarity}%` : '—'}
                        </td>
                        <td className="px-2 py-2">
                          {row.matched ? (
                            <div className="flex items-center gap-2 text-emerald-600">
                              <UserCheck2 className="h-4 w-4" />
                              <span className="text-sm font-semibold">Assigned</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400">Pending</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {filter === 'Not Matched' ? (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="secondary" onClick={() => setCurrentStep(1)} className="px-6 py-3">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={handleContinue} className="px-7 py-3 text-base">
            Continue <span aria-hidden="true">→</span>
          </Button>
        </div>
      ) : null}
    </motion.div>
  )
}
