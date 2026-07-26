from app.schemas.imports import AccountMetadataRow, ReviewMappingInput


def generate_account_metadata(
    studio_id: str,
    mappings: list[ReviewMappingInput],
) -> list[AccountMetadataRow]:
    normalized_studio_id = studio_id.strip()

    return [
        AccountMetadataRow(
            userForeignId=mapping.email.strip(),
            studioForeignId=normalized_studio_id,
            studioId=normalized_studio_id,
            email=mapping.email.strip(),
        )
        for mapping in mappings
        if mapping.email.strip()
    ]
