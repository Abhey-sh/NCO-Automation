import type { StudentRecord } from '../store/app-store'
import type { Member } from '../services/excel-parser'

export interface ReviewMappingRow {
  studentName: string
  phoneNumber: string
  matchedMember: string
  email: string
  matched: boolean
  suggestedMember: string
  suggestedEmail: string
  similarity: number
  draftQuery: string
  manualAssignmentState: 'idle' | 'ready' | 'assigned'
}

const normalizeName = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase()

const getDisplayName = (member: Member) => `${member.firstName} ${member.lastName}`.trim()

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
  members: Member[],
): ReviewMappingRow[] {
  const results = studentRecords.map((record) => {
    const studentName = record.studentName.trim().replace(/\s+/g, ' ')
    const normalizedStudent = normalizeName(studentName)

    const match = members.find((member) => {
      const fullMemberName = getDisplayName(member)
      const normalizedMember = normalizeName(fullMemberName)
      return normalizedMember === normalizedStudent
    })

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
        draftQuery: '',
        manualAssignmentState: 'idle' as const,
      }
    }

    const displayName = getDisplayName(match)

    return {
      studentName,
      phoneNumber: record.phoneNumber,
      matchedMember: displayName,
      email: match.email,
      matched: true,
      suggestedMember: displayName,
      suggestedEmail: match.email,
      similarity: 100,
      draftQuery: displayName,
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
