import unittest

from app.schemas.imports import ClassBookingLookupInput, RecurringBookingsRequest
from app.services.imports.recurring_bookings import generate_recurring_bookings


class RecurringBookingsGeneratorTests(unittest.TestCase):
    def make_request(self) -> RecurringBookingsRequest:
        return RecurringBookingsRequest.model_validate(
            {
                "studioId": "studio-1",
                "bookStartDate": "13-07-2026",
                "bookUntilDate": "13-07-2028",
                "deferralDateHeader": "Custom Deferral",
                "reviewMappings": [
                    {
                        "studentName": "Exact Student",
                        "matchedMember": "Exact Member",
                        "email": "exact@example.com",
                        "matchType": "exact",
                    },
                    {
                        "studentName": "Manual Student",
                        "matchedMember": "Manual Member",
                        "email": "manual@example.com",
                        "matchType": "manual",
                    },
                    {
                        "studentName": "Ignored Student",
                        "matchedMember": "",
                        "email": "ignored@example.com",
                        "matchType": "unmatched",
                    },
                ],
                "kpiRecords": [
                    {
                        "studentName": "Exact Student",
                        "values": {"Custom Deferral": ""},
                    },
                    {
                        "studentName": "Manual Student",
                        "values": {"Custom Deferral": ""},
                    },
                ],
                "uuidLookup": [
                    {"email": "EXACT@example.com", "userId": "user-1"},
                    {"email": "manual@example.com", "userId": "user-2"},
                    {"email": "ignored@example.com", "userId": "user-3"},
                ],
                "classBookingLookup": [
                    {
                        "userId": "user-1",
                        "programId": "program-1",
                        "scheduleCode": "schedule-1",
                    },
                    {
                        "userId": "user-2",
                        "programId": "program-2",
                        "scheduleCode": "schedule-2",
                    },
                    {
                        "userId": "user-3",
                        "programId": "program-3",
                        "scheduleCode": "schedule-3",
                    },
                ],
            }
        )

    def test_generates_rows_in_required_column_order(self) -> None:
        result = generate_recurring_bookings(self.make_request())

        self.assertEqual(result.generatedCount, 2)
        self.assertEqual(result.skippedCount, 0)
        self.assertEqual(
            list(result.rows[0].model_dump()),
            [
                "userForeignId",
                "studioForeignId",
                "studioId",
                "programId",
                "bookStartTime",
                "bookUntilTime",
                "scheduleCode",
            ],
        )

        row = result.rows[0]
        self.assertEqual(row.userForeignId, "exact@example.com")
        self.assertEqual(row.studioForeignId, "studio-1")
        self.assertEqual(row.studioId, "studio-1")
        self.assertEqual(row.programId, "program-1")
        self.assertEqual(row.bookStartTime, "2026-07-13T00:00:00Z")
        self.assertEqual(row.bookUntilTime, "2028-07-13T00:00:00Z")
        self.assertEqual(row.scheduleCode, "schedule-1")

    def test_skips_students_with_a_membership_deferral_date(self) -> None:
        request = self.make_request()
        request.kpi_records[0].values["Custom Deferral"] = "15-08-2026"

        result = generate_recurring_bookings(request)

        self.assertEqual(result.generatedCount, 1)
        self.assertEqual(result.rows[0].userForeignId, "manual@example.com")
        self.assertEqual(result.skippedCount, 1)
        self.assertEqual(
            [skip.model_dump() for skip in result.skips],
            [
                {
                    "reason": "Student has a membership deferral date",
                    "count": 1,
                }
            ],
        )

    def test_returns_aggregated_skip_reasons(self) -> None:
        request = self.make_request()
        request.uuid_lookup[1].user_id = ""
        request.class_booking_lookup[0].schedule_code = ""

        result = generate_recurring_bookings(request)

        self.assertEqual(result.generatedCount, 0)
        self.assertEqual(result.skippedCount, 2)
        self.assertEqual(result.rows, [])
        self.assertEqual(
            [skip.model_dump() for skip in result.skips],
            [
                {
                    "reason": "Missing Program ID or Schedule Code",
                    "count": 1,
                },
                {"reason": "User not found in UUID", "count": 1},
            ],
        )

    def test_consolidates_all_missing_booking_field_variations(self) -> None:
        request = self.make_request()
        request.review_mappings.append(
            request.review_mappings[0].model_copy(
                update={"email": "both-missing@example.com"}
            )
        )
        request.uuid_lookup.append(
            request.uuid_lookup[0].model_copy(
                update={"email": "both-missing@example.com", "user_id": "user-4"}
            )
        )
        request.class_booking_lookup[0].program_id = ""
        request.class_booking_lookup[1].schedule_code = ""
        request.class_booking_lookup.append(
            request.class_booking_lookup[0].model_copy(
                update={
                    "user_id": "user-4",
                    "program_id": "",
                    "schedule_code": "",
                }
            )
        )

        result = generate_recurring_bookings(request)

        self.assertEqual(result.generatedCount, 0)
        self.assertEqual(result.skippedCount, 3)
        self.assertEqual(
            [skip.model_dump() for skip in result.skips],
            [
                {
                    "reason": "Missing Program ID or Schedule Code",
                    "count": 3,
                }
            ],
        )

    def test_reports_missing_class_booking_without_exposing_email(self) -> None:
        request = self.make_request()
        request.class_booking_lookup = request.class_booking_lookup[1:]

        result = generate_recurring_bookings(request)

        self.assertEqual(result.generatedCount, 1)
        self.assertEqual(result.skippedCount, 1)
        self.assertEqual(
            [skip.model_dump() for skip in result.skips],
            [{"reason": "User not found in Class Booking", "count": 1}],
        )

    def test_supports_glofox_class_booking_export_headers(self) -> None:
        request = self.make_request()
        request.class_booking_lookup = [
            ClassBookingLookupInput.model_validate(
                {
                    "userId": "",
                    "programId": "",
                    "scheduleCode": "",
                    "values": {
                        "Dim Branch Name": "Branch 1",
                        "Flt Booking Events Branch ID,": "branch-1",
                        "Flt Booking Events Event Name,": "Class Name",
                        "Flt Booking Events Program ID,": "program-from-export",
                        "Flt Booking Events Schedule Code,": "schedule-from-export",
                        "Flt Booking Events Time Start Time,": "09:00",
                        "Dimension - User Id,": "user-1",
                        "Dimension - User Full name": "Exact Member",
                    },
                }
            )
        ]

        result = generate_recurring_bookings(request)

        self.assertEqual(result.generatedCount, 1)
        self.assertEqual(result.rows[0].programId, "program-from-export")
        self.assertEqual(result.rows[0].scheduleCode, "schedule-from-export")

    def test_rejects_invalid_configured_dates(self) -> None:
        request = self.make_request()
        request.book_start_date = "not-a-date"

        with self.assertRaisesRegex(ValueError, "Book Start Date"):
            generate_recurring_bookings(request)


if __name__ == "__main__":
    unittest.main()
