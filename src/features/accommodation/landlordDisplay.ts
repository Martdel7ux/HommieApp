/** Shared landlord display-name fallback, used everywhere a listing's landlord is shown. */
export function landlordDisplayName(
  landlord: {
    first_name?: string | null;
    display_name?: string | null;
    landlord_profile?: { contact_name?: string | null; business_name?: string | null } | null;
  } | null,
): string {
  return (
    landlord?.first_name ??
    landlord?.landlord_profile?.contact_name ??
    landlord?.landlord_profile?.business_name ??
    landlord?.display_name ??
    'Landlord'
  );
}
