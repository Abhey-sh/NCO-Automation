export interface ReviewedMapping {
  studentName: string
  matchedMember: string
  email: string
  matchType: 'exact' | 'manual'
}

export interface AccountMetadataRequest {
  studioId: string
  mappings: ReviewedMapping[]
}

export interface AccountMetadataRow {
  userForeignId: string
  studioForeignId: string
  studioId: string
  email: string
}
