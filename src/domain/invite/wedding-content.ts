/**
 * Hard-coded for this wedding — deliberately not part of the event data model.
 *
 * Shared by the guest web page and the PDF invitation so the wording and the
 * account number can only ever be wrong in one place.
 */

export const GIFTS_INTRO =
  "For those who may wish to send us their gifts through a bank transfer, we have kindly provided our bank details below for your convenience.";

export const BANK_DETAILS: { label: string; value: string }[] = [
  { label: "Bank", value: "FNB / First National Bank" },
  { label: "Account name", value: "Miss Nyunga N Kayembe" },
  { label: "Account number", value: "63041228271" },
];

/** Closing notes to guests, printed untitled at the foot of the details page. */
export const GUEST_NOTES: string[] = [
  "Due to the couple’s wishes, regrettably NO CHILDREN will be allowed.",
  "We kindly ask all guests to dress decently and modestly.",
];
