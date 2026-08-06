import re
from datetime import date, datetime, timedelta

from app.schemas.imports import (
    MembershipPlanLookupInput,
    MembershipRequest,
    MembershipResponse,
    MembershipRow,
    MembershipSkip,
)


def _normalize(value: str) -> str:
    return " ".join(value.strip().lower().split())


def get_first_available_value(
    row: dict[str, str],
    headers: list[str],
) -> str | None:
    """Return the first non-blank value for the preferred header order."""

    normalized_row = {
        _normalize(header): str(value).strip()
        for header, value in row.items()
    }
    for header in headers:
        value = normalized_row.get(_normalize(header))
        if value:
            return value
    return None


def _parse_date(value: str) -> date | None:
    normalized = " ".join(value.strip().split())
    normalized = re.sub(
        r"(\d{1,2})(?:st|nd|rd|th)\b",
        r"\1",
        normalized,
        flags=re.IGNORECASE,
    )
    if not normalized:
        return None

    try:
        serial_number = float(normalized)
        if serial_number > 0:
            return (date(1899, 12, 30) + timedelta(days=serial_number))
    except ValueError:
        pass

    try:
        return datetime.fromisoformat(normalized.replace("Z", "+00:00")).date()
    except ValueError:
        pass

    for date_format in (
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%d/%m/%y",
        "%Y/%m/%d",
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y %I:%M %p",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%d/%m/%Y %I:%M:%S %p",
        "%d/%m/%Y %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%B %d, %Y, %I:%M %p",
        "%B %d, %Y, %I:%M:%S %p",
        "%b %d, %Y, %I:%M %p",
        "%b %d, %Y, %I:%M:%S %p",
        "%B %d, %Y",
        "%b %d, %Y",
    ):
        try:
            return datetime.strptime(normalized, date_format).date()
        except ValueError:
            continue
    return None


def _format_date_time(value: str, time_value: str) -> str | None:
    parsed_date = _parse_date(value)
    if parsed_date is None:
        return None
    return f"{parsed_date.isoformat()}T{time_value}"


def _skip(
    skips: list[MembershipSkip],
    email: str,
    student_name: str,
    reason: str,
) -> None:
    skips.append(
        MembershipSkip(
            email=email,
            studentName=student_name,
            reason=reason,
        )
    )


def generate_memberships(request: MembershipRequest) -> MembershipResponse:
    """Generate Membership Import rows from reviewed exact/manual matches."""

    membership_plans: dict[str, MembershipPlanLookupInput] = {
        _normalize(item.email): item
        for item in request.membership_plan_lookup
        if item.email.strip()
    }
    kpi_records = {
        _normalize(item.student_name): {
            _normalize(header): value.strip()
            for header, value in item.values.items()
        }
        for item in request.kpi_records
        if item.student_name.strip()
    }

    deferral_header = _normalize(
        request.deferral_date_header or "Deferral Date"
    )
    price_header = _normalize(
        request.membership_price_header or "Membership price with discount"
    )

    rows: list[MembershipRow] = []
    skips: list[MembershipSkip] = []

    for mapping in request.review_mappings:
        if mapping.match_type.strip().lower() not in ("exact", "manual"):
            continue

        email = mapping.email.strip()
        student_name = (mapping.student_name or "").strip()
        membership_plan = membership_plans.get(_normalize(email))
        if membership_plan is None:
            _skip(
                skips,
                email,
                student_name,
                "Membership + Plan Name lookup not found for matched email.",
            )
            continue

        source_row = membership_plan.values or {
            "Dimension - User Current Membership Name": (
                membership_plan.membership_name
            ),
            "Dimension - User Current Membership Plan Name": (
                membership_plan.plan_name
            ),
            "Flt Total Memberships Payment Method": (
                membership_plan.payment_method
            ),
            "Flt Total Memberships Price Paid": membership_plan.price,
            "Flt Total Memberships Purchased Date": (
                membership_plan.purchased_date
            ),
            "Flt Total Memberships Commenced Date": (
                membership_plan.commenced_date
            ),
        }
        membership_name = get_first_available_value(
            source_row,
            [
                "Dimension - User Current Membership Name",
                "membership name",
            ],
        ) or membership_plan.membership_name.strip()
        plan_name = get_first_available_value(
            source_row,
            [
                "Dimension - User Current Membership Plan Name",
                "plan name",
            ],
        ) or membership_plan.plan_name.strip()
        payment_method = get_first_available_value(
            source_row,
            [
                "Flt Total Memberships Payment Method",
                "payment method",
            ],
        ) or membership_plan.payment_method.strip()
        if not membership_name or not plan_name or not payment_method:
            _skip(
                skips,
                email,
                student_name,
                "Membership name, plan name, or payment method lookup value is missing.",
            )
            continue

        membership_id = get_first_available_value(
            source_row,
            ["membership id"],
        )
        if not membership_id:
            _skip(
                skips,
                email,
                student_name,
                "Membership ID lookup not found for membership name.",
            )
            continue

        plan_code = get_first_available_value(
            source_row,
            ["plan code"],
        )
        if not plan_code:
            _skip(
                skips,
                email,
                student_name,
                "Plan Code lookup not found for plan name.",
            )
            continue

        kpi_record = kpi_records.get(_normalize(student_name))
        if kpi_record is None:
            _skip(skips, email, student_name, "KPI record not found for student.")
            continue

        deferral_date = kpi_record.get(deferral_header, "").strip()
        source_status = (
            get_first_available_value(source_row, ["status"]) or ""
        ).upper()
        source_next_payment_date = get_first_available_value(
            source_row,
            [
                "Flt Total Memberships Next Payment Date",
                "next payment date",
            ],
        )
        source_purchase_date = get_first_available_value(
            source_row,
            [
                "Flt Total Memberships Purchased Date",
                "purchase date",
            ],
        ) or membership_plan.purchased_date.strip()
        price = (
            kpi_record.get(price_header, "").strip()
            or get_first_available_value(
                source_row,
                [
                    "Flt Total Memberships Price Paid",
                    "price",
                ],
            )
            or membership_plan.price.strip()
        )
        if not price:
            _skip(
                skips,
                email,
                student_name,
                "Membership price was not found in KPI or Membership + Plan Name.",
            )
            continue

        if source_status == "FUTURE":
            if not source_next_payment_date:
                _skip(
                    skips,
                    email,
                    student_name,
                    "Next Payment Date is missing for FUTURE membership.",
                )
                continue
            membership_status = "FUTURE"
            purchase_date = source_purchase_date or source_next_payment_date
            commenced_date = source_next_payment_date
            cycle_start_date = source_next_payment_date
            next_payment_date = source_next_payment_date
        elif deferral_date:
            membership_status = "FUTURE"
            purchase_date = source_purchase_date or deferral_date
            commenced_date = deferral_date
            cycle_start_date = deferral_date
            next_payment_date = deferral_date
        else:
            membership_status = "ACTIVE"
            purchase_date = source_purchase_date
            commenced_date = get_first_available_value(
                source_row,
                [
                    "Flt Total Memberships Commenced Date",
                    "commenced date",
                ],
            ) or membership_plan.commenced_date.strip()
            if not purchase_date or not commenced_date:
                missing_dates = []
                if not purchase_date:
                    missing_dates.append("Purchase Date")
                if not commenced_date:
                    missing_dates.append("Commenced Date")
                _skip(
                    skips,
                    email,
                    student_name,
                    "; ".join(
                        f"{date_name} is missing"
                        for date_name in missing_dates
                    )
                    + ".",
                )
                continue
            cycle_start_date = request.cycle_start_date.strip()
            next_payment_date = request.next_payment_date.strip()

        formatted_purchase_date = _format_date_time(purchase_date, "00:00:00")
        formatted_commenced_date = _format_date_time(commenced_date, "00:00:00")
        formatted_cycle_start_date = _format_date_time(
            cycle_start_date,
            "00:00:00",
        )
        formatted_next_payment_date = _format_date_time(
            next_payment_date,
            "10:29:30",
        )
        date_results = (
            ("Purchase Date", purchase_date, formatted_purchase_date),
            ("Commenced Date", commenced_date, formatted_commenced_date),
            ("Cycle Start Date", cycle_start_date, formatted_cycle_start_date),
            (
                "Next Payment Date",
                next_payment_date,
                formatted_next_payment_date,
            ),
        )
        date_issues = [
            (
                f"{label} is missing"
                if not raw_value.strip()
                else f"{label} has an unsupported value: {raw_value}"
            )
            for label, raw_value, formatted_value in date_results
            if formatted_value is None
        ]
        if date_issues:
            _skip(
                skips,
                email,
                student_name,
                "; ".join(date_issues) + ".",
            )
            continue

        rows.append(
            MembershipRow(
                userForeignId=email,
                studioForeignId=request.studio_id.strip(),
                studioId=request.studio_id.strip(),
                email=email,
                status=membership_status,
                userMembershipForeignId=membership_id,
                membershipPlanForeignId=plan_code,
                membershipName=membership_name,
                planName=plan_name,
                membershipId=membership_id,
                planCode=plan_code,
                price=price,
                paymentMethod=payment_method,
                localPurchaseDate=formatted_purchase_date,
                localCommencedDate=formatted_commenced_date,
                localCycleStartDate=formatted_cycle_start_date,
                localNextPaymentDate=formatted_next_payment_date,
                order=1,
            )
        )

    return MembershipResponse(
        rows=rows,
        generatedCount=len(rows),
        skippedCount=len(skips),
        skips=skips,
    )
