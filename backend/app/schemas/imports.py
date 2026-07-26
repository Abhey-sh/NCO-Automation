from pydantic import BaseModel, ConfigDict, Field


class ReviewMappingInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: str = Field(min_length=1)
    student_name: str | None = Field(default=None, alias="studentName")
    matched_member: str | None = Field(default=None, alias="matchedMember")


class AccountMetadataRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    studio_id: str = Field(min_length=1, alias="studioId")
    mappings: list[ReviewMappingInput]


class AccountMetadataRow(BaseModel):
    userForeignId: str
    studioForeignId: str
    studioId: str
    email: str
