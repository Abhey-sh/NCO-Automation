import * as XLSX from "xlsx";

import type { StudentRecord } from "../store/app-store";

export interface MembershipPlanLookup {
  fullName: string;
  email: string;
  userId: string;
  membershipName: string;
  planName: string;
  paymentMethod: string;
  price: string;
  purchasedDate: string;
  commencedDate: string;
  values: Record<string, string>;
}

export interface UUIDRow {
  uuid: string;
}

export interface ClassBookingRow {
  bookingId: string;
}

export interface ParsedKPISheet {
  studentNames: string[];
  studentRecords: StudentRecord[];
}

export interface ParsedMembershipPlanSheet {
  lookup: MembershipPlanLookup[];
}

function findColumnKey(
  row: Record<string, unknown>,
  keywords: string[],
): string | undefined {
  const normalizedRow = Object.keys(row).map((key) => ({
    original: key,
    normalized: key.toLowerCase().trim(),
  }));

  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase().trim();
    const match = normalizedRow.find(
      (k) =>
        k.normalized === normalized ||
        k.normalized.includes(normalized) ||
        normalized.includes(k.normalized),
    );
    if (match) return match.original;
  }

  return undefined;
}

function findPreferredColumnKey(
  row: Record<string, unknown>,
  headers: string[],
  legacyKeywords: string[] = [],
): string | undefined {
  const keys = Object.keys(row);
  const normalizeHeader = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim();
    const match = keys.find(
      (key) => key.toLowerCase().trim() === normalizedHeader,
    );
    if (match) return match;

    const normalizedCompactHeader = normalizeHeader(header);
    const compactMatch = keys.find(
      (key) => normalizeHeader(key) === normalizedCompactHeader,
    );
    if (compactMatch) return compactMatch;
  }

  return legacyKeywords.length > 0
    ? findColumnKey(row, legacyKeywords)
    : undefined;
}

async function readWorksheet(
  file: File,
): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;

        const workbook = XLSX.read(data, {
          type: "binary",
        });

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(worksheet) as Array<
          Record<string, unknown>
        >;

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));

    reader.readAsBinaryString(file);
  });
}

export async function parseKPISheet(file: File): Promise<ParsedKPISheet> {
  const rows = await readWorksheet(file);

  if (rows.length === 0) {
    return {
      studentNames: [],
      studentRecords: [],
    };
  }

  const firstRow = rows[0];

  console.log("KPI Sheet columns found:", Object.keys(firstRow));

  const studentNameKey = findColumnKey(firstRow, [
    "student name",
    "studentname",
    "student_name",
    "name",
    "student",
  ]);

  const phoneNumberKey = findColumnKey(firstRow, [
    "phone",
    "phone number",
    "phone_number",
    "mobile",
    "mobile number",
    "mobile_number",
    "contact number",
    "contact_number",
    "telephone",
    "telephone number",
    "cell phone",
    "phone no",
    "mobile no",
  ]);

  const studentRecords: StudentRecord[] = rows
    .map<StudentRecord | null>((row) => {
      const rawName = studentNameKey
        ? String(row[studentNameKey] ?? "").trim()
        : "";

      const studentName = rawName.replace(/\s+/g, " ");

      const phoneNumber = phoneNumberKey
        ? String(row[phoneNumberKey] ?? "").trim()
        : "";

      if (!studentName) {
        return null;
      }

      return {
        studentName,
        phoneNumber,
        values: Object.fromEntries(
          Object.entries(row).map(([header, value]) => [
            header,
            String(value ?? "").trim(),
          ]),
        ),
      };
    })
    .filter((record): record is StudentRecord => record !== null);

  return {
    studentNames: studentRecords.map((student) => student.studentName),
    studentRecords,
  };
}

export async function parseMembershipPlanNameSheet(
  file: File,
): Promise<ParsedMembershipPlanSheet> {
  const rows = await readWorksheet(file);

  if (rows.length === 0) {
    return {
      lookup: [],
    };
  }

  const firstRow = rows[0];

  console.log("Membership + Plan Name columns:", Object.keys(firstRow));

  const fullNameKey = findPreferredColumnKey(
    firstRow,
    ["Full Name", "Dimension - User Full Name", "User Full Name", "Name"],
    ["member full name", "customer name"],
  );

  const emailKey = findPreferredColumnKey(
    firstRow,
    ["Dimension - User Email", "email"],
    ["email address", "e-mail"],
  );

  const userIdKey = findColumnKey(firstRow, [
    "user id",
    "userid",
    "user_id",
    "dimension - user id",
  ]);

  const membershipNameKey = findPreferredColumnKey(firstRow, [
    "Dimension - User Current Membership Name",
    "membership name",
  ]);

  const planNameKey = findPreferredColumnKey(firstRow, [
    "Dimension - User Current Membership Plan Name",
    "plan name",
  ]);

  const paymentMethodKey = findPreferredColumnKey(firstRow, [
    "Flt Total Memberships Payment Method",
    "payment method",
  ]);

  const priceKey = findPreferredColumnKey(
    firstRow,
    ["Flt Total Memberships Price Paid", "price"],
    ["price paid", "membership price"],
  );

  const purchasedDateKey = findPreferredColumnKey(
    firstRow,
    ["Flt Total Memberships Purchased Date", "purchase date"],
    ["purchased date"],
  );

  const commencedDateKey = findPreferredColumnKey(firstRow, [
    "Flt Total Memberships Commenced Date",
    "commenced date",
  ]);

  console.log({
    fullNameKey,
    emailKey,
    userIdKey,
    membershipNameKey,
    planNameKey,
    paymentMethodKey,
    priceKey,
    purchasedDateKey,
    commencedDateKey,
  });

  const lookup: MembershipPlanLookup[] = rows
    .map((row) => {
      const fullName = fullNameKey
        ? String(row[fullNameKey] ?? "").trim().replace(/\s+/g, " ")
        : "";
      const email = emailKey ? String(row[emailKey] ?? "").trim() : "";

      const userId = userIdKey ? String(row[userIdKey] ?? "").trim() : "";

      const membershipName = membershipNameKey
        ? String(row[membershipNameKey] ?? "").trim()
        : "";

      const planName = planNameKey
        ? String(row[planNameKey] ?? "").trim()
        : "";

      const paymentMethod = paymentMethodKey
        ? String(row[paymentMethodKey] ?? "").trim()
        : "";

      const price = priceKey
        ? String(row[priceKey] ?? "").trim()
        : "";

      const purchasedDate = purchasedDateKey
        ? String(row[purchasedDateKey] ?? "").trim()
        : "";

      const commencedDate = commencedDateKey
        ? String(row[commencedDateKey] ?? "").trim()
        : "";

      if (!email) {
        return null;
      }

      return {
        fullName,
        email,
        userId,
        membershipName,
        planName,
        paymentMethod,
        price,
        purchasedDate,
        commencedDate,
        values: Object.fromEntries(
          Object.entries(row).map(([header, value]) => [
            header,
            String(value ?? "").trim(),
          ]),
        ),
      };
    })
    .filter(
      (row): row is MembershipPlanLookup => row !== null,
    );

  console.log("Parsed Membership + Plan Name:", lookup.length);

  return {
    lookup,
  };
}
