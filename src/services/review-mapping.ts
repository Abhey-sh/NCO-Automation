import type { StudentRecord } from '../store/app-store'
import type { MembershipPlanLookup } from '../services/excel-parser'

export interface ReviewMappingRow {
  studentName: string
  phoneNumber: string
  matchedMember: string
  email: string
  matched: boolean
  suggestedMember: string
  suggestedEmail: string
  similarity: number
  matchType: 'exact' | 'manual' | null
  draftQuery: string
  manualAssignmentState: 'idle' | 'ready' | 'assigned'
}

const normalizeName = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

export function getMembershipFullName(member: MembershipPlanLookup) {
  const values = Object.entries(member.values ?? {})
  const normalizeHeader = (header: string) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, '')
  const valueFor = (headers: string[]) => {
    const normalizedHeaders = new Set(headers.map(normalizeHeader))
    return values.find(([header]) => normalizedHeaders.has(normalizeHeader(header)))?.[1]?.trim() ?? ''
  }

  const fullName = valueFor([
    'full name',
    'dimension - user full name',
    'user full name',
    'member full name',
    'customer name',
    'name',
  ])
  if (fullName) return fullName

  const combinedName = [valueFor(['first name', 'firstname']), valueFor(['last name', 'lastname'])]
    .filter(Boolean)
    .join(' ')
    .trim()
  return combinedName || member.fullName?.trim() || ''
}

function calculateSimilarity(valueA: string, valueB: string): number {
  const left = normalizeName(valueA)
  const right = normalizeName(valueB)

  if (!left || !right) {
    return 0
  }

  if (left === right) {
    return 100
  }

  const maxLength = Math.max(left.length, right.length)
  let distance = 0
  const leftChars = left.split('')
  const rightChars = right.split('')
  const matrix = Array.from({ length: leftChars.length + 1 }, () => Array(rightChars.length + 1).fill(0))

  for (let i = 0; i <= leftChars.length; i += 1) {
    matrix[i][0] = i
  }

  for (let j = 0; j <= rightChars.length; j += 1) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= leftChars.length; i += 1) {
    for (let j = 1; j <= rightChars.length; j += 1) {
      const cost = leftChars[i - 1] === rightChars[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  distance = matrix[leftChars.length][rightChars.length]
  const ratio = 1 - distance / maxLength
  return Math.max(0, Math.round(ratio * 100))
}

export function buildReviewMappingRows(
  studentRecords: StudentRecord[],
  membershipPlanLookup: MembershipPlanLookup[],
): ReviewMappingRow[] {
  const membersByNormalizedName = new Map<
    string,
    { member: MembershipPlanLookup; displayName: string }
  >()

  membershipPlanLookup.forEach((member) => {
    const displayName = getMembershipFullName(member)
    const normalizedName = normalizeName(displayName)

    // Preserve the previous Array.find behavior when duplicate names exist.
    if (normalizedName && !membersByNormalizedName.has(normalizedName)) {
      membersByNormalizedName.set(normalizedName, { member, displayName })
    }
  })

  const results = studentRecords.map((record) => {
    const studentName = record.studentName.trim().replace(/\s+/g, ' ')
    const normalizedStudent = normalizeName(studentName)
    const match = membersByNormalizedName.get(normalizedStudent)

    if (!match) {
      return {
        studentName,
        phoneNumber: record.phoneNumber,
        matchedMember: '—',
        email: '—',
        matched: false,
        suggestedMember: '',
        suggestedEmail: '',
        similarity: 0,
        matchType: null,
        draftQuery: '',
        manualAssignmentState: 'idle' as const,
      }
    }

    return {
      studentName,
      phoneNumber: record.phoneNumber,
      matchedMember: match.displayName,
      email: match.member.email,
      matched: true,
      suggestedMember: match.displayName,
      suggestedEmail: match.member.email,
      similarity: 100,
      matchType: 'exact' as const,
      draftQuery: match.displayName,
      manualAssignmentState: 'assigned' as const,
    }
  })

  const matchCount = results.filter((r) => r.matched).length
  const notMatchCount = results.filter((r) => !r.matched).length
  console.log(`Review Mapping Results: Total=${results.length}, Matched=${matchCount}, Not Matched=${notMatchCount}`)
  console.log('Sample matched records:', results.filter((r) => r.matched).slice(0, 3))
  console.log('Sample not matched records:', results.filter((r) => !r.matched).slice(0, 3))

  return results
}

export function computeSimilarity(valueA: string, valueB: string): number {
  return calculateSimilarity(valueA, valueB)
}
