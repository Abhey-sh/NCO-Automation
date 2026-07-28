import type {
  AccountMetadataRequest,
  AccountMetadataRow,
  MembershipCancellationRequest,
  MembershipCancellationRow,
  MembershipRequest,
  MembershipResponse,
} from "../types/imports";

const defaultApiBaseUrl =
  window.location.protocol === "file:" ? "http://127.0.0.1:8000" : "";
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl
).replace(/\/$/, "");

async function postImport<TRequest, TResponse>(
  path: string,
  payload: TRequest,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(errorBody?.detail ?? "Import generation failed.");
  }

  return response.json() as Promise<TResponse>;
}

export function generateAccountMetadata(payload: AccountMetadataRequest) {
  return postImport<AccountMetadataRequest, AccountMetadataRow[]>(
    "/imports/account-metadata",
    payload,
  );
}
export function generateMembershipCancellation(
  payload: MembershipCancellationRequest,
) {
  return postImport<MembershipCancellationRequest, MembershipCancellationRow[]>(
    "/imports/membership-cancellation",
    payload,
  );
}

export function generateMemberships(payload: MembershipRequest) {
  return postImport<MembershipRequest, MembershipResponse>(
    "/imports/memberships",
    payload,
  );
}
