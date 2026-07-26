import type { MembershipPlanLookup } from "../services/excel-parser";
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
