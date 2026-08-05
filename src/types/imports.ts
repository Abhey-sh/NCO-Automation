import type { MembershipPlanLookup } from "../services/excel-parser";
import type { ClassBookingRow, UUIDRow } from "../services/excel-parser";
export interface ReviewedMapping {
  studentName: string;
  matchedMember: string;
  email: string;
  matchType: "exact" | "manual";
}

export interface AccountMetadataRequest {
  studioId: string;
  mappings: ReviewedMapping[];
}
export interface MembershipCancellationRequest {
  reviewMappings: ReviewedMapping[];
  membershipLookup: MembershipPlanLookup[];
}

export interface MembershipKPIRecord {
  studentName: string;
  values: Record<string, string>;
}

export interface MembershipRequest {
  studioId: string;
  cycleStartDate: string;
  nextPaymentDate: string;
  deferralDateHeader: string;
  membershipPriceHeader: string;
  reviewMappings: ReviewedMapping[];
  membershipPlanLookup: MembershipPlanLookup[];
  kpiRecords: MembershipKPIRecord[];
}

export interface RecurringBookingsRequest {
  studioId: string;
  bookStartDate: string;
  bookUntilDate: string;
  deferralDateHeader: string;
  reviewMappings: ReviewedMapping[];
  kpiRecords: MembershipKPIRecord[];
  uuidLookup: UUIDRow[];
  classBookingLookup: ClassBookingRow[];
}

export interface AccountMetadataRow {
  userForeignId: string;
  studioForeignId: string;
  studioId: string;
  email: string;
}
export interface MembershipCancellationRow {
  email: string;
  userId: string;
}

export interface MembershipRow {
  userForeignId: string;
  studioForeignId: string;
  studioId: string;
  email: string;
  status: string;
  userMembershipForeignId: string;
  membershipPlanForeignId: string;
  membershipName: string;
  planName: string;
  membershipId: string;
  planCode: string;
  price: string;
  paymentMethod: string;
  localPurchaseDate: string;
  localCommencedDate: string;
  localCycleStartDate: string;
  localNextPaymentDate: string;
  order: number;
  localCycleExpiryDate: string;
  localContractEndDate: string;
  autoRenewal: string;
  localPausedFromDate: string;
  localPausedUntilDate: string;
  localLockStartDate: string;
  overdueAmount: string;
  isRetrying: string;
}

export interface RecurringBookingsRow {
  userForeignId: string;
  studioForeignId: string;
  studioId: string;
  programId: string;
  bookStartTime: string;
  bookUntilTime: string;
  scheduleCode: string;
}

export interface MembershipSkip {
  email: string;
  studentName: string;
  reason: string;
}

export interface RecurringBookingsSkipSummary {
  reason: string;
  count: number;
}

export interface MembershipResponse {
  rows: MembershipRow[];
  generatedCount: number;
  skippedCount: number;
  skips: MembershipSkip[];
}

export interface RecurringBookingsResponse {
  rows: RecurringBookingsRow[];
  generatedCount: number;
  skippedCount: number;
  skips: RecurringBookingsSkipSummary[];
}
