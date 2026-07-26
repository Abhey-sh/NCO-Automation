import * as XLSX from 'xlsx'

import type { StudentRecord } from '../store/app-store'

export interface ParsedKPISheet {
  studentNames: string[]
  studentRecords: StudentRecord[]
}

export interface ParsedMembersSheet {
  members: Array<{
    firstName: string
    lastName: string
    email: string
  }>
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

export async function parseKPISheet(file: File): Promise<ParsedKPISheet> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(worksheet)

        if (rows.length === 0) {
          resolve({ studentNames: [], studentRecords: [] })
          return
        }

        const firstRow = rows[0] as Record<string, unknown>
        console.log('KPI Sheet columns found:', Object.keys(firstRow))

        const studentNameKey = findColumnKey(firstRow, ['student name', 'studentname', 'student_name', 'name', 'student'])
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

        console.log('Student Name column:', studentNameKey, 'Phone column:', phoneNumberKey)

        const studentRecords = (rows as Array<Record<string, unknown>>)
          .map((row) => {
            const rawName = studentNameKey ? String(row[studentNameKey] || '').trim() : ''
            const studentName = rawName.replace(/\s+/g, ' ')
            const phoneNumber = phoneNumberKey ? String(row[phoneNumberKey] || '').trim() : ''

            if (!studentName) {
              return null
            }

            return {
              studentName,
              phoneNumber,
            }
          })
          .filter((record): record is StudentRecord => record !== null)

        const studentNames = studentRecords.map((record) => record.studentName)

        console.log('Extracted student records:', studentRecords.length, studentRecords.slice(0, 5))

        resolve({ studentNames, studentRecords })
      } catch (error) {
        reject(new Error(`Failed to parse KPI Sheet: ${error}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read KPI Sheet file'))
    }

    reader.readAsBinaryString(file)
  })
}

export async function parseMembersSheet(file: File): Promise<ParsedMembersSheet> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(worksheet)

        if (rows.length === 0) {
          resolve({ members: [] })
          return
        }

        const firstRow = rows[0] as Record<string, unknown>
        console.log('Members Sheet columns found:', Object.keys(firstRow))

        const firstNameKey = findColumnKey(firstRow, ['first name', 'firstname', 'first_name', 'fname', 'forename'])
        const lastNameKey = findColumnKey(firstRow, ['last name', 'lastname', 'last_name', 'lname', 'surname'])
        const emailKey = findColumnKey(firstRow, ['email', 'email_id', 'emailid', 'email address', 'e-mail'])

        const fullNameKey = !firstNameKey && !lastNameKey ? findColumnKey(firstRow, ['name', 'full name', 'fullname', 'member name']) : undefined

        console.log('Member columns - First:', firstNameKey, 'Last:', lastNameKey, 'Full Name:', fullNameKey, 'Email:', emailKey)

        const members = (rows as Array<Record<string, unknown>>)
          .map((row) => {
            let firstName = ''
            let lastName = ''

            if (fullNameKey && !firstNameKey && !lastNameKey) {
              const fullName = String(row[fullNameKey] || '').trim()
              const parts = fullName.split(/\s+/)
              if (parts.length >= 2) {
                firstName = parts[0]
                lastName = parts.slice(1).join(' ')
              } else if (parts.length === 1) {
                firstName = parts[0]
                lastName = ''
              }
            } else {
              firstName = firstNameKey ? String(row[firstNameKey] || '').trim() : ''
              lastName = lastNameKey ? String(row[lastNameKey] || '').trim() : ''
            }

            const email = emailKey ? String(row[emailKey] || '').trim() : ''

            if (firstName && lastName && email) {
              return { firstName, lastName, email }
            } else if (firstName && email) {
              return { firstName, lastName: '', email }
            }

            return null
          })
          .filter((member) => member !== null) as Array<{ firstName: string; lastName: string; email: string }>

        console.log('Extracted members:', members.length, members.slice(0, 5))

        resolve({ members })
      } catch (error) {
        reject(new Error(`Failed to parse Members Sheet: ${error}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read Members file'))
    }

    reader.readAsBinaryString(file)
  })
}
