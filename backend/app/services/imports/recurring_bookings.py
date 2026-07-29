from datetime import date, datetime, timedelta

from app.schemas.imports import (
    RecurringBookingsRequest,
    RecurringBookingsResponse,
    RecurringBookingsRow,
    RecurringBookingsSkipSummary,
)

MISSING_BOOKING_FIELDS = "Missing Program ID or Schedule Code"
USER_NOT_FOUND_IN_CLASS_BOOKING = "User not found in Class Booking"
USER_NOT_FOUND_IN_UUID = "User not found in UUID"
SKIP_REASON_ORDER = (
    MISSING_BOOKING_FIELDS,
    USER_NOT_FOUND_IN_CLASS_BOOKING,
    USER_NOT_FOUND_IN_UUID,
)


def _normalize(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _normalize_header(value: str) -> str:
    return "".join(character for character in value.lower() if character.isalnum())


def _first_available_value(row: dict[str, str], headers: list[str]) -> str:
    normalized_row = {
        _normalize_header(header): str(value).strip()
        for header, value in row.items()
    }
    for header in headers:
        value = normalized_row.get(_normalize_header(header), "")
        if value:
            return value
    return ""


def _parse_date(value: str) -> date | None:
    normalized = " ".join(value.strip().split())
    if not normalized:
        return None

    try:
        serial_number = float(normalized)
        if serial_number > 0:
            return date(1899, 12, 30) + timedelta(days=serial_number)
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
    ):
        try:
            return datetime.strptime(normalized, date_format).date()
        except ValueError:
            continue

    return None


def _format_book_time(value: str) -> str | None:
    parsed_date = _parse_date(value)
    if parsed_date is None:
        return None
    return f"{parsed_date.isoformat()}T00:00:00Z"


def _add_skip(skips: dict[str, int], reason: str) -> None:
    skips[reason] = skips.get(reason, 0) + 1


def generate_recurring_bookings(
    request: RecurringBookingsRequest,
) -> RecurringBookingsResponse:
    """Generate Recurring Bookings rows from reviewed exact/manual matches."""

    email_to_user_id: dict[str, str] = {}
    for item in request.uuid_lookup:
        email = item.email.strip() or _first_available_value(
            item.values,
            [
                "Email",
                "Dimension - User Email",
                "User Email",
                "Email Address",
                "E-mail",
            ],
        )
        user_id = item.user_id.strip() or _first_available_value(
            item.values,
            [
                "User ID",
                "Dimension - User ID",
                "Dimension - User Id",
                "UUID",
                "User UUID",
                "Glofox User ID",
                "Member ID",
                "Customer ID",
            ],
        )
        if email and user_id:
            email_to_user_id[_normalize(email)] = user_id

    user_id_to_booking: dict[str, tuple[str, str]] = {}
    for item in request.class_booking_lookup:
        user_id = item.user_id.strip() or _first_available_value(
            item.values,
            [
                "User ID",
                "Dimension - User ID",
                "Dimension - User Id",
                "UUID",
                "User UUID",
                "Glofox User ID",
                "Member ID",
                "Customer ID",
            ],
        )
        program_id = item.program_id.strip() or _first_available_value(
            item.values,
            [
                "Program ID",
                "Programme ID",
                "Dimension - Program ID",
                "Class Program ID",
                "Flt Booking Events Program ID",
            ],
        )
        schedule_code = item.schedule_code.strip() or _first_available_value(
            item.values,
            [
                "Schedule Code",
                "ScheduleCode",
                "Schedule",
                "Class Schedule Code",
                "Flt Booking Events Schedule Code",
            ],
        )
        if user_id:
            user_id_to_booking[_normalize(user_id)] = (program_id, schedule_code)

    book_start_time = _format_book_time(request.book_start_date)
    book_until_time = _format_book_time(request.book_until_date)
    if book_start_time is None:
        raise ValueError("Book Start Date must be a valid date.")
    if book_until_time is None:
        raise ValueError("Book Until Date must be a valid date.")

    rows: list[RecurringBookingsRow] = []
    skips: dict[str, int] = {}
    studio_id = request.studio_id.strip()

    for mapping in request.review_mappings:
        if mapping.match_type.strip().lower() not in ("exact", "manual"):
            continue

        email = mapping.email.strip()
        normalized_email = _normalize(email)
        user_id = email_to_user_id.get(normalized_email)
        if not user_id:
            _add_skip(skips, USER_NOT_FOUND_IN_UUID)
            continue

        booking_values = user_id_to_booking.get(_normalize(user_id))
        if booking_values is None:
            _add_skip(skips, USER_NOT_FOUND_IN_CLASS_BOOKING)
            continue
        program_id, schedule_code = booking_values
        if not program_id or not schedule_code:
            _add_skip(skips, MISSING_BOOKING_FIELDS)
            continue

        rows.append(
            RecurringBookingsRow(
                userForeignId=email,
                studioForeignId=studio_id,
                studioId=studio_id,
                programId=program_id,
                bookStartTime=book_start_time,
                bookUntilTime=book_until_time,
                scheduleCode=schedule_code,
            )
        )

    return RecurringBookingsResponse(
        rows=rows,
        generatedCount=len(rows),
        skippedCount=sum(skips.values()),
        skips=[
            RecurringBookingsSkipSummary(reason=reason, count=skips[reason])
            for reason in SKIP_REASON_ORDER
            if reason in skips
        ],
    )
