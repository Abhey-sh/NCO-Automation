import * as XLSX from 'xlsx'

import type { StudentRecord } from '../store/app-store'

export interface Member {
  firstName: string
  lastName: string
  email: string
}

export interface MembershipPlanLookup {
  email: string
  userId: string
}

export interface MembershipLookupRow {
  membershipId: string
  membershipName: string
}

export interface UUIDRow {
  uuid: string
}

export interface ClassBookingRow {
  bookingId: string
}

export interface FutureMembershipRow {
  membershipName: string
}

export interface ParsedKPISheet {
  studentNames: string[]
  studentRecords: StudentRecord[]
}

export interface ParsedMembersSheet {
  members: Member[]
}

export interface ParsedMembershipPlanSheet {
  lookup: MembershipPlanLookup[]
}

function findColumnKey(row: Record<string, unknown>, keywords: string[]): string | undefined {
  const normalizedRow = Object.keys(row).map((key) => ({
    original: key,
    normalized: key.toLowerCase().trim(),
  }))

  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase().trim()
    const match = normalizedRow.find((k) =>
      k.normalized === normalized || k.normalized.includes(normalized) || normalized.includes(k.normalized),
    )
    if (match) return match.original
  }

  return undefined
}

async function readWorksheet(
  file: File,
): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const data = event.target?.result

        const workbook = XLSX.read(data, {
          type: 'binary',
        })

        const worksheet =
          workbook.Sheets[workbook.SheetNames[0]]

        const rows = XLSX.utils.sheet_to_json(
          worksheet,
        ) as Array<Record<string, unknown>>

        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))

    reader.readAsBinaryString(file)
  })
}

export async function parseKPISheet(
  file: File,
): Promise<ParsedKPISheet> {
  const rows = await readWorksheet(file)

  if (rows.length === 0) {
    return {
      studentNames: [],
      studentRecords: [],
    }
  }

  const firstRow = rows[0]

  console.log('KPI Sheet columns found:', Object.keys(firstRow))

  const studentNameKey = findColumnKey(firstRow, [
    'student name',
    'studentname',
    'student_name',
    'name',
    'student',
  ])

  const phoneNumberKey = findColumnKey(firstRow, [
    'phone',
    'phone number',
    'phone_number',
    'mobile',
    'mobile number',
    'mobile_number',
    'contact number',
    'contact_number',
    'telephone',
    'telephone number',
    'cell phone',
    'phone no',
    'mobile no',
  ])

  const studentRecords: StudentRecord[] = rows
    .map((row) => {
      const rawName = studentNameKey
        ? String(row[studentNameKey] ?? '').trim()
        : ''

      const studentName = rawName.replace(/\s+/g, ' ')

      const phoneNumber = phoneNumberKey
        ? String(row[phoneNumberKey] ?? '').trim()
        : ''

      if (!studentName) {
        return null
      }

      return {
        studentName,
        phoneNumber,
      }
    })
    .filter(
      (record): record is StudentRecord =>
        record !== null,
    )

  return {
    studentNames: studentRecords.map(
      (student) => student.studentName,
    ),
    studentRecords,
  }
}

export async function parseMembersSheet(
  file: File,
): Promise<ParsedMembersSheet> {
  const rows = await readWorksheet(file)

  if (rows.length === 0) {
    return {
      members: [],
    }
  }

  const firstRow = rows[0]

  const firstNameKey = findColumnKey(firstRow, [
    'first name',
    'firstname',
    'first_name',
    'fname',
  ])

  const lastNameKey = findColumnKey(firstRow, [
    'last name',
    'lastname',
    'last_name',
    'lname',
    'surname',
  ])

  const emailKey = findColumnKey(firstRow, [
    'email',
    'email address',
    'email_id',
    'e-mail',
  ])

  const fullNameKey =
    !firstNameKey && !lastNameKey
      ? findColumnKey(firstRow, [
          'name',
          'full name',
          'member name',
        ])
      : undefined

  const members: Member[] = rows
    .map((row) => {
      let firstName = ''
      let lastName = ''

      if (fullNameKey) {
        const parts = String(
          row[fullNameKey] ?? '',
        )
          .trim()
          .split(/\s+/)

        firstName = parts[0] ?? ''
        lastName = parts.slice(1).join(' ')
      } else {
        firstName = firstNameKey
          ? String(row[firstNameKey] ?? '').trim()
          : ''

        lastName = lastNameKey
          ? String(row[lastNameKey] ?? '').trim()
          : ''
      }

      const email = emailKey
        ? String(row[emailKey] ?? '').trim()
        : ''

      if (!firstName || !email) {
        return null
      }

      return {
        firstName,
        lastName,
        email,
      }
    })
    .filter((x): x is Member => x !== null)

  return {
    members,
  }
}

export async function parseMembershipPlanNameSheet(
  file: File,
): Promise<ParsedMembershipPlanSheet> {
  const rows = await readWorksheet(file)

  if (rows.length === 0) {
    return {
      lookup: [],
    }
  }

  const firstRow = rows[0]

  console.log(
    'Membership + Plan Name columns:',
    Object.keys(firstRow),
  )

  const emailKey = findColumnKey(firstRow, [
    'email',
    'email address',
    'e-mail',
  ])

  const userIdKey = findColumnKey(firstRow, [
    'user id',
    'userid',
    'user_id',
    'dimension - user id',
  ])

  console.log(
    'Email column:',
    emailKey,
    'User Id column:',
    userIdKey,
  )

  const lookup: MembershipPlanLookup[] = rows
    .map((row) => {
      const email = emailKey
        ? String(row[emailKey] ?? '').trim()
        : ''

      const userId = userIdKey
        ? String(row[userIdKey] ?? '').trim()
        : ''

      if (!email || !userId) {
        return null
      }

      return {
        email,
        userId,
      }
    })
    .filter(
      (row): row is MembershipPlanLookup =>
        row !== null,
    )

  console.log(
    'Parsed Membership + Plan Name:',
    lookup.length,
  )

  return {
    lookup,
  }
}