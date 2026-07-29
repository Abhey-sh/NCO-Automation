from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# Shared Input Models
# ============================================================================
# These models represent the payload received from the frontend and are reused
# across multiple import generators.
# ============================================================================

class ReviewMappingInput(BaseModel):
    """Represents a reviewed student-to-member mapping.

    Only Exact and Manual matches are processed by downstream generators.
    Unmatched records are ignored.
    """

    model_config = ConfigDict(populate_by_name=True)

    email: str = Field(min_length=1)
    student_name: str | None = Field(default=None, alias="studentName")
    matched_member: str | None = Field(default=None, alias="matchedMember")
    match_type: str = Field(default="exact", alias="matchType")


class MembershipPlanLookupInput(BaseModel):
    """Lookup record from the Membership + Plan Name export.

    Used to resolve membership information for a matched member including
    membership/plan names, payment method and fallback price.
    """

    email: str
    user_id: str = Field(alias="userId")
    membership_name: str = Field(alias="membershipName")
    plan_name: str = Field(alias="planName")
    payment_method: str = Field(alias="paymentMethod")
    price: str
    purchased_date: str = Field(default="", alias="purchasedDate")
    commenced_date: str = Field(default="", alias="commencedDate")
    values: dict[str, str] = Field(default_factory=dict)


class MembershipLookupInput(BaseModel):
    """Lookup record used to resolve internal Membership IDs and Plan Codes."""

    membership_name: str = Field(alias="membershipName")
    membership_id: str = Field(alias="membershipId")
    plan_name: str = Field(alias="planName")
    plan_code: str = Field(alias="planCode")


class UUIDLookupInput(BaseModel):
    """Lookup record used to resolve a matched email to a Glofox User ID."""

    model_config = ConfigDict(populate_by_name=True)

    email: str
    user_id: str = Field(default="", alias="userId")
    values: dict[str, str] = Field(default_factory=dict)


class ClassBookingLookupInput(BaseModel):
    """Lookup record used to resolve recurring booking fields by User ID."""

    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(default="", alias="userId")
    program_id: str = Field(default="", alias="programId")
    schedule_code: str = Field(default="", alias="scheduleCode")
    values: dict[str, str] = Field(default_factory=dict)


class KPIRecordInput(BaseModel):
    """KPI row retained with its original headers for configurable lookups."""

    model_config = ConfigDict(populate_by_name=True)

    student_name: str = Field(alias="studentName")
    values: dict[str, str]


# ============================================================================
# Request Models
# ============================================================================
# Each generator receives a strongly typed request containing all datasets
# required to build its corresponding import file.
# ============================================================================

class AccountMetadataRequest(BaseModel):
    """Request payload for Account-metadata generation."""
    model_config = ConfigDict(populate_by_name=True)

    studio_id: str = Field(min_length=1, alias="studioId")
    mappings: list[ReviewMappingInput]


class MembershipCancellationRequest(BaseModel):
    """Request payload for Membership Cancellation generation."""
    model_config = ConfigDict(populate_by_name=True)

    reviewMappings: list[ReviewMappingInput]
    membershipLookup: list[MembershipPlanLookupInput]


class MembershipRequest(BaseModel):
    """Request payload for Membership Import generation."""
    model_config = ConfigDict(populate_by_name=True)

    studio_id: str = Field(min_length=1, alias="studioId")
    cycle_start_date: str = Field(min_length=1, alias="cycleStartDate")
    next_payment_date: str = Field(min_length=1, alias="nextPaymentDate")
    deferral_date_header: str = Field(
        default="Deferral Date",
        alias="deferralDateHeader",
    )
    membership_price_header: str = Field(
        default="Membership price with discount",
        alias="membershipPriceHeader",
    )
    review_mappings: list[ReviewMappingInput] = Field(alias="reviewMappings")
    membership_plan_lookup: list[MembershipPlanLookupInput] = Field(
        alias="membershipPlanLookup",
    )
    membership_lookup: list[MembershipLookupInput] = Field(
        default_factory=list,
        alias="membershipLookup",
    )
    kpi_records: list[KPIRecordInput] = Field(alias="kpiRecords")


class RecurringBookingsRequest(BaseModel):
    """Request payload for Recurring Bookings Import generation."""

    model_config = ConfigDict(populate_by_name=True)

    studio_id: str = Field(min_length=1, alias="studioId")
    book_start_date: str = Field(min_length=1, alias="bookStartDate")
    book_until_date: str = Field(min_length=1, alias="bookUntilDate")
    review_mappings: list[ReviewMappingInput] = Field(alias="reviewMappings")
    uuid_lookup: list[UUIDLookupInput] = Field(alias="uuidLookup")
    class_booking_lookup: list[ClassBookingLookupInput] = Field(
        alias="classBookingLookup",
    )


# ============================================================================
# Output Models
# ============================================================================
# These models define the exact CSV structure produced by each generator.
# Property names intentionally match the import template headers.
# ============================================================================

class AccountMetadataRow(BaseModel):
    userForeignId: str
    studioForeignId: str
    studioId: str
    email: str


class MembershipCancellationRow(BaseModel):
    email: str
    userId: str


class MembershipRow(BaseModel):
    """Represents one row in the exact Membership Import CSV contract."""

    userForeignId: str
    studioForeignId: str
    studioId: str
    email: str
    status: str
    userMembershipForeignId: str
    membershipPlanForeignId: str
    membershipName: str
    planName: str
    membershipId: str
    planCode: str
    price: str
    paymentMethod: str
    localPurchaseDate: str
    localCommencedDate: str
    localCycleStartDate: str
    localNextPaymentDate: str
    order: int
    localCycleExpiryDate: str = ""
    localContractEndDate: str = ""
    autoRenewal: str = ""
    localPausedFromDate: str = ""
    localPausedUntilDate: str = ""
    localLockStartDate: str = ""
    overdueAmount: str = ""
    isRetrying: str = ""


class RecurringBookingsRow(BaseModel):
    """Represents one row in the exact Recurring Bookings Import CSV contract."""

    userForeignId: str
    studioForeignId: str
    studioId: str
    programId: str
    bookStartTime: str
    bookUntilTime: str
    scheduleCode: str


class MembershipSkip(BaseModel):
    email: str
    studentName: str
    reason: str


class RecurringBookingsSkipSummary(BaseModel):
    reason: str
    count: int


class MembershipResponse(BaseModel):
    rows: list[MembershipRow]
    generatedCount: int
    skippedCount: int
    skips: list[MembershipSkip]


class RecurringBookingsResponse(BaseModel):
    rows: list[RecurringBookingsRow]
    generatedCount: int
    skippedCount: int
    skips: list[RecurringBookingsSkipSummary]
