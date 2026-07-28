import unittest

from app.schemas.imports import MembershipRequest
from app.services.imports.memberships import (
    generate_memberships,
    get_first_available_value,
)


class MembershipGeneratorTests(unittest.TestCase):
    def make_request(self) -> MembershipRequest:
        return MembershipRequest.model_validate(
            {
                "studioId": "studio-1",
                "cycleStartDate": "01-08-2026",
                "nextPaymentDate": "01-09-2026",
                "deferralDateHeader": "Custom Deferral",
                "membershipPriceHeader": "Custom Price",
                "reviewMappings": [
                    {
                        "studentName": "Active Student",
                        "matchedMember": "Active Member",
                        "email": "active@example.com",
                        "matchType": "exact",
                    },
                    {
                        "studentName": "Future Student",
                        "matchedMember": "Future Member",
                        "email": "future@example.com",
                        "matchType": "manual",
                    },
                    {
                        "studentName": "Ignored Student",
                        "matchedMember": "",
                        "email": "ignored@example.com",
                        "matchType": "unmatched",
                    },
                ],
                "membershipPlanLookup": [
                    {
                        "email": "ACTIVE@example.com",
                        "userId": "user-1",
                        "membershipName": "Monthly",
                        "planName": "Standard",
                        "paymentMethod": "CARD",
                        "price": "99",
                        "purchasedDate": "02-07-2026",
                        "commencedDate": "03-07-2026",
                        "values": {
                            "Dimension - User Current Membership Name": "Monthly",
                            "Dimension - User Current Membership Plan Name": "Standard",
                            "membership id": "membership-1",
                            "plan code": "standard-code",
                            "Flt Total Memberships Payment Method": "CARD",
                            "Flt Total Memberships Price Paid": "99",
                            "Flt Total Memberships Purchased Date": "02-07-2026",
                            "Flt Total Memberships Commenced Date": "03-07-2026",
                        },
                    },
                    {
                        "email": "future@example.com",
                        "userId": "user-2",
                        "membershipName": "Annual",
                        "planName": "Premium",
                        "paymentMethod": "DIRECT_DEBIT",
                        "price": "199",
                        "values": {
                            "membership name": "Annual",
                            "plan name": "Premium",
                            "membership id": "membership-2",
                            "plan code": "premium-code",
                            "payment method": "DIRECT_DEBIT",
                            "price": "199",
                        },
                    },
                ],
                "membershipLookup": [
                    {
                        "membershipName": "Monthly",
                        "membershipId": "membership-1",
                        "planName": "Standard",
                        "planCode": "standard-code",
                    },
                    {
                        "membershipName": "Annual",
                        "membershipId": "membership-2",
                        "planName": "Premium",
                        "planCode": "premium-code",
                    },
                ],
                "kpiRecords": [
                    {
                        "studentName": "Active Student",
                        "values": {"Custom Deferral": "", "Custom Price": "89"},
                    },
                    {
                        "studentName": "Future Student",
                        "values": {
                            "Custom Deferral": "15-08-2026",
                            "Custom Price": "",
                        },
                    },
                ],
            }
        )

    def test_generates_active_and_future_rows_in_required_column_order(self) -> None:
        result = generate_memberships(self.make_request())

        self.assertEqual(result.generatedCount, 2)
        self.assertEqual(result.skippedCount, 0)
        self.assertEqual(
            list(result.rows[0].model_dump()),
            [
                "userForeignId",
                "studioForeignId",
                "studioId",
                "email",
                "status",
                "userMembershipForeignId",
                "membershipPlanForeignId",
                "membershipName",
                "planName",
                "membershipId",
                "planCode",
                "price",
                "paymentMethod",
                "localPurchaseDate",
                "localCommencedDate",
                "localCycleStartDate",
                "localNextPaymentDate",
                "order",
                "localCycleExpiryDate",
                "localContractEndDate",
                "autoRenewal",
                "localPausedFromDate",
                "localPausedUntilDate",
                "localLockStartDate",
                "overdueAmount",
                "isRetrying",
            ],
        )
        self.assertEqual(result.rows[0].localCycleExpiryDate, "")
        self.assertEqual(result.rows[0].localContractEndDate, "")
        self.assertEqual(result.rows[0].autoRenewal, "")
        self.assertEqual(result.rows[0].localPausedFromDate, "")
        self.assertEqual(result.rows[0].localPausedUntilDate, "")
        self.assertEqual(result.rows[0].localLockStartDate, "")
        self.assertEqual(result.rows[0].overdueAmount, "")
        self.assertEqual(result.rows[0].isRetrying, "")

        active = result.rows[0]
        self.assertEqual(active.status, "ACTIVE")
        self.assertEqual(active.price, "89")
        self.assertEqual(active.localPurchaseDate, "2026-07-02T00:00:00")
        self.assertEqual(active.localCommencedDate, "2026-07-03T00:00:00")
        self.assertEqual(active.localCycleStartDate, "2026-08-01T00:00:00")
        self.assertEqual(active.localNextPaymentDate, "2026-09-01T10:29:30")

        future = result.rows[1]
        self.assertEqual(future.status, "FUTURE")
        self.assertEqual(future.price, "199")
        self.assertEqual(future.localPurchaseDate, "2026-08-15T00:00:00")
        self.assertEqual(future.localCommencedDate, "2026-08-15T00:00:00")
        self.assertEqual(future.localCycleStartDate, "2026-08-15T00:00:00")
        self.assertEqual(future.localNextPaymentDate, "2026-08-15T10:29:30")

    def test_skips_failed_required_lookup_and_continues(self) -> None:
        request = self.make_request()
        request.membership_plan_lookup[1].values.pop("membership id")

        result = generate_memberships(request)

        self.assertEqual(result.generatedCount, 1)
        self.assertEqual(result.skippedCount, 1)
        self.assertEqual(result.skips[0].email, "future@example.com")
        self.assertIn("Membership ID", result.skips[0].reason)

    def test_supports_simplified_membership_plan_headers(self) -> None:
        request = MembershipRequest.model_validate(
            {
                "studioId": "studio-1",
                "cycleStartDate": "01-08-2026",
                "nextPaymentDate": "01-09-2026",
                "reviewMappings": [
                    {
                        "studentName": "Simple Student",
                        "email": "simple@example.com",
                        "matchType": "exact",
                    }
                ],
                "membershipPlanLookup": [
                    {
                        "email": "simple@example.com",
                        "userId": "",
                        "membershipName": "Simple Membership",
                        "planName": "Simple Plan",
                        "paymentMethod": "CARD",
                        "price": "75",
                        "purchasedDate": "02-07-2026",
                        "commencedDate": "03-07-2026",
                        "values": {
                            "email": "simple@example.com",
                            "membership name": "Simple Membership",
                            "plan name": "Simple Plan",
                            "membership id": "simple-membership-id",
                            "plan code": "simple-plan-code",
                            "payment method": "CARD",
                            "price": "75",
                            "purchase date": "02-07-2026",
                            "commenced date": "03-07-2026",
                            "next payment date": "05-09-2026",
                        },
                    }
                ],
                "membershipLookup": [],
                "kpiRecords": [
                    {
                        "studentName": "Simple Student",
                        "values": {
                            "Deferral Date": "",
                            "Membership price with discount": "",
                        },
                    }
                ],
            }
        )

        result = generate_memberships(request)

        self.assertEqual(result.generatedCount, 1)
        row = result.rows[0]
        self.assertEqual(row.membershipId, "simple-membership-id")
        self.assertEqual(row.planCode, "simple-plan-code")
        self.assertEqual(row.price, "75")
        self.assertEqual(row.localPurchaseDate, "2026-07-02T00:00:00")
        self.assertEqual(row.localCommencedDate, "2026-07-03T00:00:00")
        self.assertEqual(row.localNextPaymentDate, "2026-09-05T10:29:30")

    def test_uses_source_next_payment_date_for_future_status(self) -> None:
        request = self.make_request()
        source_values = request.membership_plan_lookup[0].values
        source_values["status"] = "FUTURE"
        source_values["next payment date"] = "20-08-2026"

        result = generate_memberships(request)

        row = result.rows[0]
        self.assertEqual(row.status, "FUTURE")
        self.assertEqual(row.localPurchaseDate, "2026-07-02T00:00:00")
        self.assertEqual(row.localCommencedDate, "2026-08-20T00:00:00")
        self.assertEqual(row.localCycleStartDate, "2026-08-20T00:00:00")
        self.assertEqual(row.localNextPaymentDate, "2026-08-20T10:29:30")

    def test_future_purchase_date_falls_back_to_next_payment_date(self) -> None:
        request = self.make_request()
        membership_plan = request.membership_plan_lookup[0]
        membership_plan.values["status"] = "FUTURE"
        membership_plan.values["next payment date"] = "20-08-2026"
        membership_plan.values.pop("Flt Total Memberships Purchased Date")
        membership_plan.purchased_date = ""

        result = generate_memberships(request)

        row = result.rows[0]
        self.assertEqual(row.localPurchaseDate, "2026-08-20T00:00:00")

    def test_formats_us_export_dates_with_times(self) -> None:
        request = self.make_request()
        source_values = request.membership_plan_lookup[0].values
        source_values["Flt Total Memberships Purchased Date"] = (
            "7/31/2026 12:00:00 AM"
        )
        source_values["Flt Total Memberships Commenced Date"] = (
            "8/1/2026 10:15:00 AM"
        )

        result = generate_memberships(request)

        row = result.rows[0]
        self.assertEqual(row.localPurchaseDate, "2026-07-31T00:00:00")
        self.assertEqual(row.localCommencedDate, "2026-08-01T00:00:00")

    def test_formats_month_name_export_dates(self) -> None:
        request = self.make_request()
        source_values = request.membership_plan_lookup[0].values
        source_values["Flt Total Memberships Purchased Date"] = (
            "July 9, 2026, 10:17 PM"
        )
        source_values["Flt Total Memberships Commenced Date"] = (
            "July 9, 2026, 10:27\u202fPM"
        )

        result = generate_memberships(request)

        row = result.rows[0]
        self.assertEqual(row.localPurchaseDate, "2026-07-09T00:00:00")
        self.assertEqual(row.localCommencedDate, "2026-07-09T00:00:00")

    def test_formats_ordinal_month_name_dates(self) -> None:
        request = self.make_request()
        request.kpi_records[0].values["Custom Deferral"] = "August 18th, 2026"

        result = generate_memberships(request)

        row = result.rows[0]
        self.assertEqual(row.localPurchaseDate, "2026-07-02T00:00:00")
        self.assertEqual(row.localCommencedDate, "2026-08-18T00:00:00")
        self.assertEqual(row.localCycleStartDate, "2026-08-18T00:00:00")
        self.assertEqual(row.localNextPaymentDate, "2026-08-18T10:29:30")

    def test_reports_the_specific_invalid_date(self) -> None:
        request = self.make_request()
        request.membership_plan_lookup[0].values[
            "Flt Total Memberships Purchased Date"
        ] = "not-a-date"

        result = generate_memberships(request)

        active_skip = next(
            skip
            for skip in result.skips
            if skip.email == "active@example.com"
        )
        self.assertEqual(
            active_skip.reason,
            "Purchase Date has an unsupported value: not-a-date.",
        )

    def test_first_available_value_honors_header_priority(self) -> None:
        value = get_first_available_value(
            {
                "purchase date": "fallback",
                "Flt Total Memberships Purchased Date": "primary",
            },
            [
                "Flt Total Memberships Purchased Date",
                "purchase date",
            ],
        )

        self.assertEqual(value, "primary")


if __name__ == "__main__":
    unittest.main()
