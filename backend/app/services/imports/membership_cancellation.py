from app.schemas.imports import (
    MembershipCancellationRow,
    MembershipPlanLookupInput,
    ReviewMappingInput,
)


def generate_membership_cancellation(
    mappings: list[ReviewMappingInput],
    membership_lookup: list[MembershipPlanLookupInput],
) -> list[MembershipCancellationRow]:
    """
    Generates Membership Cancellation rows.

    Only Exact and Manual mappings are included.
    Email is matched against Membership + Plan Name lookup.
    """

    lookup = {
        item.email.strip().lower(): item.userId
        for item in membership_lookup
        if item.email and item.userId
    }

    rows: list[MembershipCancellationRow] = []
    print("Mappings received:", len(mappings))
    print("Lookup received:", len(membership_lookup))
    for mapping in mappings:
        if mapping.match_type not in ("exact", "manual"):
            continue

        email = mapping.email.strip().lower()

        user_id = lookup.get(email)

        if not user_id:
            continue

        rows.append(
            MembershipCancellationRow(
                email=mapping.email,
                userId=user_id,
            )
        )

    return rows