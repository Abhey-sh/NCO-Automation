import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  AccountMetadataRow,
  MembershipCancellationRow,
  MembershipRow,
  RecurringBookingsRow,
  ReviewedMapping,
} from "../types/imports";

import type {
  ClassBookingRow,
  MembershipPlanLookup,
  UUIDRow,
} from "../services/excel-parser";

export type ThemeMode = "light" | "dark";
export type UploadStatus = "idle" | "uploading" | "valid" | "invalid";

export interface UploadItem {
  id: string;
  title: string;
  required: boolean;
  status: UploadStatus;
  progress: number;
  filename: string;
  message: string;
  fileData?: File;
}

export interface StudentRecord {
  studentName: string;
  phoneNumber: string;
  values?: Record<string, string>;
}

interface AppState {
  theme: ThemeMode;
  currentStep: number;
  uploads: UploadItem[];
  studentNames: string[];
  studentRecords: StudentRecord[];
  uuidLookup: UUIDRow[];
  classBookingLookup: ClassBookingRow[];
  membershipPlanLookup: MembershipPlanLookup[];
  assignedMappings: Record<string, { matchedMember: string; email: string }>;
  memberNotFound: StudentRecord[];
  reviewedMappings: ReviewedMapping[];
  accountMetadataRows: AccountMetadataRow[];
  membershipCancellationRows: MembershipCancellationRow[];
  membershipRows: MembershipRow[];
  recurringBookingsRows: RecurringBookingsRow[];
  configurationState: {
    studioId: string;
    cycleStartDate: string;
    nextPaymentDate: string;
    deferralDateHeader: string;
    membershipPriceHeader: string;
    bookStartDateTime: string;
    bookUntilDateTime: string;
  };
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setCurrentStep: (step: number) => void;
  setUploadState: (id: string, updates: Partial<UploadItem>) => void;
  setFileData: (fileId: string, data: File) => void;
  setStudentNames: (names: string[]) => void;
  setStudentRecords: (records: StudentRecord[]) => void;
  setUUIDLookup: (lookup: UUIDRow[]) => void;
  setClassBookingLookup: (lookup: ClassBookingRow[]) => void;
  setAssignedMapping: (
    studentName: string,
    mapping: { matchedMember: string; email: string } | null,
  ) => void;
  setMemberNotFound: (records: StudentRecord[]) => void;
  setReviewedMappings: (mappings: ReviewedMapping[]) => void;
  setAccountMetadataRows: (rows: AccountMetadataRow[]) => void;
  setMembershipPlanLookup(lookup: MembershipPlanLookup[]): void;
  setMembershipCancellationRows: (rows: MembershipCancellationRow[]) => void;
  setMembershipRows: (rows: MembershipRow[]) => void;
  setRecurringBookingsRows: (rows: RecurringBookingsRow[]) => void;
  setConfigurationState: (
    config: Partial<AppState["configurationState"]>,
  ) => void;
  completeStepOne: () => void;
}

const initialUploads: UploadItem[] = [
  {
    id: "kpi-sheet",
    title: "KPI Sheet",
    required: true,
    status: "idle",
    progress: 0,
    filename: "",
    message: "Awaiting upload",
  },
  {
    id: "uuid",
    title: "UUID",
    required: true,
    status: "idle",
    progress: 0,
    filename: "",
    message: "Awaiting upload",
  },
  {
    id: "membership-plan-name",
    title: "Membership + Plan Name",
    required: true,
    status: "idle",
    progress: 0,
    filename: "",
    message: "Awaiting upload",
  },
  {
    id: "class-booking",
    title: "Class Booking",
    required: true,
    status: "idle",
    progress: 0,
    filename: "",
    message: "Awaiting upload",
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "light",
      currentStep: 1,
      uploads: initialUploads,
      studentNames: [],
      studentRecords: [],
      uuidLookup: [],
      classBookingLookup: [],
      membershipPlanLookup: [],
      assignedMappings: {},
      memberNotFound: [],
      reviewedMappings: [],
      accountMetadataRows: [],
      membershipCancellationRows: [],
      membershipRows: [],
      recurringBookingsRows: [],
      configurationState: {
        studioId: "",
        cycleStartDate: "",
        nextPaymentDate: "",
        deferralDateHeader: "Deferral Date",
        membershipPriceHeader: "Membership price with discount",
        bookStartDateTime: "",
        bookUntilDateTime: "",
      },
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),
      setCurrentStep: (step) => set({ currentStep: step }),
      setUploadState: (id, updates) =>
        set((state) => ({
          uploads: state.uploads.map((upload) =>
            upload.id === id ? { ...upload, ...updates } : upload,
          ),
        })),
      setFileData: (fileId, data) =>
        set((state) => ({
          uploads: state.uploads.map((upload) =>
            upload.id === fileId ? { ...upload, fileData: data } : upload,
          ),
        })),
      setStudentNames: (names) =>
        set({
          studentNames: names,
          studentRecords: names.map((studentName) => ({
            studentName,
            phoneNumber: "",
            values: {},
          })),
        }),
      setStudentRecords: (records) =>
        set({
          studentRecords: records,
          studentNames: records.map((record) => record.studentName),
        }),
      setUUIDLookup: (lookup) =>
        set({
          uuidLookup: lookup,
        }),
      setClassBookingLookup: (lookup) =>
        set({
          classBookingLookup: lookup,
        }),
      setMembershipPlanLookup: (lookup) =>
        set({
          membershipPlanLookup: lookup,
        }),
      setAssignedMapping: (studentName, mapping) =>
        set((state) => ({
          assignedMappings: mapping
            ? { ...state.assignedMappings, [studentName]: mapping }
            : Object.keys(state.assignedMappings).reduce(
                (acc, key) => {
                  if (key === studentName) return acc;
                  // @ts-ignore
                  acc[key] = state.assignedMappings[key];
                  return acc;
                },
                {} as Record<string, { matchedMember: string; email: string }>,
              ),
        })),
      setMemberNotFound: (records) => set({ memberNotFound: records }),
      setReviewedMappings: (mappings) => set({ reviewedMappings: mappings }),
      setAccountMetadataRows: (rows) => set({ accountMetadataRows: rows }),
      setMembershipCancellationRows: (rows) =>
        set({ membershipCancellationRows: rows }),
      setMembershipRows: (rows) => set({ membershipRows: rows }),
      setRecurringBookingsRows: (rows) =>
        set({ recurringBookingsRows: rows }),
      setConfigurationState: (config) =>
        set((state) => ({
          configurationState: { ...state.configurationState, ...config },
        })),
      completeStepOne: () => set({ currentStep: 2 }),
    }),
    {
      name: "nco-automation-studio",
      partialize: (state) => ({
        theme: state.theme,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>;
        return {
          ...currentState,
          theme: persisted.theme ?? currentState.theme,
        };
      },
    },
  ),
);
