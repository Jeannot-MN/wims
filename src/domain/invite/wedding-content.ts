/**
 * Hard-coded for this wedding — deliberately not part of the event data model.
 *
 * Shared by the guest web page and the PDF invitation so the wording and the
 * account number can only ever be wrong in one place. The PDF is English-only;
 * the French entries serve the language toggle on the web invitation.
 */

export const GIFTS_PARAGRAPHS = {
  en: [
    "We would sincerely appreciate envelopes as our preferred form of gifts.",
    "For those who may wish to transfer, our bank details are below for your convenience.",
  ],
  fr: [
    "Nous apprécierions sincèrement les enveloppes comme forme de cadeau privilégiée.",
    "Pour celles et ceux qui souhaiteraient faire un virement, nos coordonnées bancaires figurent ci-dessous.",
  ],
};

export const BANK_DETAILS: {
  label: string;
  label_fr: string;
  value: string;
}[] = [
  { label: "Bank", label_fr: "Banque", value: "FNB / First National Bank" },
  {
    label: "Account name",
    label_fr: "Titulaire du compte",
    value: "Miss Nyunga N Kayembe",
  },
  {
    label: "Account number",
    label_fr: "Numéro de compte",
    value: "63041228271",
  },
];

/** Closing notes to guests, printed untitled at the foot of the details page. */
export const GUEST_NOTES = {
  en: ["We kindly ask all guests to dress decently and modestly."],
  fr: [
    "Nous prions tous les invités de s’habiller de manière décente et modeste.",
  ],
};
