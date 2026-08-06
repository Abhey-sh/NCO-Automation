import re
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
MEMBERSHIP_DEFERRED = "Student has a membership deferral date"
SKIP_REASON_ORDER = (
    MEMBERSHIP_DEFERRED,
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


def _extract_age_range(value: str) -> tuple[int, int] | None:
    match = re.search(
        r"(?<!\d)(\d{1,2})\s*(?:-|–|—|to)\s*(\d{1,2})(?!\d)",
        value,
        flags=re.IGNORECASE,
    )
    if match is None:
        return None
    return int(match.group(1)), int(match.group(2))


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

    deferral_header = _normalize_header(
        request.deferral_date_header or "Deferral Date"
    )
    deferred_students = {
        _normalize(item.student_name)
        for item in request.kpi_records
        if item.student_name.strip()
        and any(
            _normalize_header(header) == deferral_header
            and str(value).strip()
            for header, value in item.values.items()
        )
    }
    class_wanted_by_student = {
        _normalize(item.student_name): _first_available_value(
            item.values,
            ["Class Wanted"],
        )
        for item in request.kpi_records
        if item.student_name.strip()
    }

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

    user_id_to_bookings: dict[str, list[tuple[str, str, str]]] = {}
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
        event_name = _first_available_value(
            item.values,
            [
                "Flt Booking Events Event Name",
                "Event Name",
                "Class Name",
            ],
        )
        if user_id:
            user_id_to_bookings.setdefault(_normalize(user_id), []).append(
                (program_id, schedule_code, event_name)
            )

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

        if _normalize(mapping.student_name) in deferred_students:
            _add_skip(skips, MEMBERSHIP_DEFERRED)
            continue

        email = mapping.email.strip()
        normalized_email = _normalize(email)
        user_id = email_to_user_id.get(normalized_email)
        if not user_id:
            _add_skip(skips, USER_NOT_FOUND_IN_UUID)
            continue

        booking_options = user_id_to_bookings.get(_normalize(user_id))
        if booking_options is None:
            _add_skip(skips, USER_NOT_FOUND_IN_CLASS_BOOKING)
            continue

        selected_booking = booking_options[-1]
        if len(booking_options) > 1:
            wanted_age_range = _extract_age_range(
                class_wanted_by_student.get(_normalize(mapping.student_name), "")
            )
            if wanted_age_range is not None:
                matching_bookings = [
                    booking
                    for booking in booking_options
                    if _extract_age_range(booking[2]) == wanted_age_range
                ]
                if matching_bookings:
                    selected_booking = matching_bookings[-1]

        program_id, schedule_code, _ = selected_booking
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
