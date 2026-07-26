import unittest

from app.schemas.imports import ReviewMappingInput
from app.services.imports.account_metadata import generate_account_metadata


class AccountMetadataGeneratorTests(unittest.TestCase):
    def test_generates_required_columns_in_order(self) -> None:
        rows = generate_account_metadata(
            "12345",
            [ReviewMappingInput(email="john@gmail.com")],
        )

        self.assertEqual(
            rows[0].model_dump(),
            {
                "userForeignId": "john@gmail.com",
                "studioForeignId": "12345",
                "studioId": "12345",
                "email": "john@gmail.com",
            },
        )

    def test_ignores_blank_emails(self) -> None:
        rows = generate_account_metadata(
            "12345",
            [ReviewMappingInput(email="   ")],
        )

        self.assertEqual(rows, [])


if __name__ == "__main__":
    unittest.main()
