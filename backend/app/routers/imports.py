from fastapi import APIRouter, HTTPException, status

from app.schemas.imports import (
    AccountMetadataRequest,
    AccountMetadataRow,
    MembershipCancellationRequest,
    MembershipCancellationRow,
    MembershipRequest,
    MembershipResponse,
    RecurringBookingsRequest,
    RecurringBookingsResponse,
)

from app.services.imports.account_metadata import generate_account_metadata
from app.services.imports.membership_cancellation import (
    generate_membership_cancellation,
)
from app.services.imports.memberships import generate_memberships
from app.services.imports.recurring_bookings import generate_recurring_bookings

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/account-metadata", response_model=list[AccountMetadataRow])
def create_account_metadata_import(
    request: AccountMetadataRequest,
) -> list[AccountMetadataRow]:
    studio_id = request.studio_id.strip()
    if not studio_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Studio ID is required before generating Account Metadata.",
        )

    rows = generate_account_metadata(studio_id, request.mappings)
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No matched students available.",
        )

    return rows

@router.post(
    "/membership-cancellation",
    response_model=list[MembershipCancellationRow],
)
def create_membership_cancellation_import(
    request: MembershipCancellationRequest,
) -> list[MembershipCancellationRow]:
    rows = generate_membership_cancellation(
        request.reviewMappings,
        request.membershipLookup,
    )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No matched memberships available.",
        )

    return rows


@router.post("/memberships", response_model=MembershipResponse)
def create_memberships_import(request: MembershipRequest) -> MembershipResponse:
    if not request.studio_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Studio ID is required before generating Membership Import.",
        )

    return generate_memberships(request)


@router.post("/recurring-bookings", response_model=RecurringBookingsResponse)
def create_recurring_bookings_import(
    request: RecurringBookingsRequest,
) -> RecurringBookingsResponse:
    if not request.studio_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Studio ID is required before generating Recurring Bookings Import.",
        )
    if not request.book_start_date.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book Start Date is required before generating Recurring Bookings Import.",
        )
    if not request.book_until_date.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book Until Date is required before generating Recurring Bookings Import.",
        )
    if not request.review_mappings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review Mapping must be completed before generating Recurring Bookings Import.",
        )
    if not request.uuid_lookup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="UUID file is required before generating Recurring Bookings Import.",
        )
    if not request.class_booking_lookup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class Booking file is required before generating Recurring Bookings Import.",
        )

    try:
        return generate_recurring_bookings(request)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
