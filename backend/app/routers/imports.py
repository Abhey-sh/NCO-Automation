from fastapi import APIRouter, HTTPException, status

from app.schemas.imports import (
    AccountMetadataRequest,
    AccountMetadataRow,
    MembershipCancellationRequest,
    MembershipCancellationRow,
)

from app.services.imports.account_metadata import generate_account_metadata
from app.services.imports.membership_cancellation import (
    generate_membership_cancellation,
)

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