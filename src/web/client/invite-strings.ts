/**
 * The guest invitation's static copy, in both languages, plus the pure helpers
 * that resolve a string for a locale. Kept free of React so it can be unit
 * tested directly; `invite-i18n.tsx` wraps it in a context for the page.
 */

export type Locale = "en" | "fr";

export const LOCALES: Locale[] = ["en", "fr"];

export const STRINGS = {
  en: {
    loading: "Loading your invitation…",
    notFoundTitle: "Invitation not found",
    notFoundBody: "This invite link doesn’t look right. Please check the link with your host.",

    navHome: "Home",
    navDetails: "Details",
    navSchedule: "Schedule",
    navRsvp: "RSVP",

    heroInvited: "Dear {name}, you are invited",
    heroGuestFallback: "guest",
    scroll: "Scroll",

    countdownDays: "Days",
    countdownHours: "Hours",
    countdownMinutes: "Minutes",
    countdownSeconds: "Seconds",
    countdownArrived: "I have found the one whom my soul loves.",

    detailsEyebrow: "The day",
    detailsTitle: "Details",
    when: "When",
    where: "Where",
    dressCodeLabel: "Dress code",
    viewOnMap: "View on map ↗",
    toBeAnnounced: "To be announced",
    comeAsYouWish: "Come as you wish",

    giftsEyebrow: "With gratitude",
    giftsTitle: "Gifts",

    dressCodeEyebrow: "What to wear",
    dressCodeTitle: "Dress code",
    previousOutfit: "Previous outfit",
    nextOutfit: "Next outfit",
    showOutfit: "Show outfit {n}",
    outfitAlt: "Dress code inspiration {n} of {total}",

    scheduleEyebrow: "Order of the day",
    scheduleTitle: "Schedule",

    rsvpEyebrow: "Kindly respond",
    rsvpTitle: "RSVP",
    rsvpClosedTitle: "RSVPs are closed",
    rsvpClosedBody: "The deadline was {date}. Please reach out to the hosts directly.",
    respondBy: "Please respond by {date}.",
    optionAccept: "Joyfully accept",
    optionAcceptSub: "Count me in",
    optionMaybe: "Tentative",
    optionMaybeSub: "Not yet sure",
    optionDecline: "Regretfully decline",
    optionDeclineSub: "Cannot make it",
    partnerFirstName: "Partner first name",
    partnerLastName: "Partner last name",
    emailLabel: "Email address",
    emailHint: "So we can reach you with any updates about the day. We’ll never share it.",
    chooseOne: "Please choose Accept, Maybe, or Decline.",
    submitFailed: "Submit failed",
    savedMessage:
      "Thank you — your response has been recorded. You can update it any time before the deadline.",
    sending: "Sending…",
    sendResponse: "Send my response",
    updateResponse: "Update my response",

    giftRegistryTitle: "Gift registry",
    visitRegistry: "Visit our registry",

    footerLine: "With love, we can’t wait to celebrate with you.",
    downloadInvitation: "Download invitation",
  },

  fr: {
    loading: "Chargement de votre invitation…",
    notFoundTitle: "Invitation introuvable",
    notFoundBody:
      "Ce lien d’invitation ne semble pas correct. Merci de le vérifier auprès de vos hôtes.",

    navHome: "Accueil",
    navDetails: "Détails",
    navSchedule: "Programme",
    navRsvp: "RSVP",

    heroInvited: "Cher(e) {name}, vous êtes invité(e)",
    heroGuestFallback: "invité(e)",
    scroll: "Défiler",

    countdownDays: "Jours",
    countdownHours: "Heures",
    countdownMinutes: "Minutes",
    countdownSeconds: "Secondes",
    countdownArrived: "J’ai trouvé celui que mon cœur aime.",

    detailsEyebrow: "Le grand jour",
    detailsTitle: "Détails",
    when: "Quand",
    where: "Où",
    dressCodeLabel: "Tenue",
    viewOnMap: "Voir sur la carte ↗",
    toBeAnnounced: "À communiquer",
    comeAsYouWish: "Venez comme il vous plaira",

    giftsEyebrow: "Avec gratitude",
    giftsTitle: "Cadeaux",

    dressCodeEyebrow: "Comment s’habiller",
    dressCodeTitle: "Tenue",
    previousOutfit: "Tenue précédente",
    nextOutfit: "Tenue suivante",
    showOutfit: "Afficher la tenue {n}",
    outfitAlt: "Inspiration tenue {n} sur {total}",

    scheduleEyebrow: "Déroulé de la journée",
    scheduleTitle: "Programme",

    rsvpEyebrow: "Merci de répondre",
    rsvpTitle: "RSVP",
    rsvpClosedTitle: "Les réponses sont closes",
    rsvpClosedBody: "La date limite était le {date}. Merci de contacter directement vos hôtes.",
    respondBy: "Merci de répondre avant le {date}.",
    optionAccept: "J’accepte avec joie",
    optionAcceptSub: "Je serai présent(e)",
    optionMaybe: "Peut-être",
    optionMaybeSub: "Encore incertain(e)",
    optionDecline: "Je décline à regret",
    optionDeclineSub: "Je ne pourrai pas venir",
    partnerFirstName: "Prénom de votre partenaire",
    partnerLastName: "Nom de votre partenaire",
    emailLabel: "Adresse e-mail",
    emailHint:
      "Pour pouvoir vous joindre si quelque chose change. Elle ne sera jamais communiquée à des tiers.",
    chooseOne: "Merci de choisir Accepter, Peut-être ou Décliner.",
    submitFailed: "L’envoi a échoué",
    savedMessage:
      "Merci — votre réponse a bien été enregistrée. Vous pouvez la modifier à tout moment avant la date limite.",
    sending: "Envoi…",
    sendResponse: "Envoyer ma réponse",
    updateResponse: "Modifier ma réponse",

    giftRegistryTitle: "Liste de mariage",
    visitRegistry: "Voir notre liste",

    footerLine: "Avec tout notre amour, nous avons hâte de célébrer avec vous.",
    downloadInvitation: "Télécharger l’invitation",
  },
} satisfies Record<Locale, Record<string, string>>;

export type StringKey = keyof (typeof STRINGS)["en"];

/** BCP-47 tags for Intl, so dates and times read naturally in each language. */
export const DATE_LOCALE: Record<Locale, string> = { en: "en-GB", fr: "fr-FR" };

/** Static string for a locale, with optional {placeholder} substitution. */
export function translate(
  locale: Locale,
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const raw: string = STRINGS[locale][key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Host-entered text: the French value when we're in French and the host
 * actually filled it in, otherwise the original. A half-translated event
 * therefore reads as a mix rather than showing blanks.
 */
export function pickLocalised(
  locale: Locale,
  base: string,
  french: string | null | undefined,
): string {
  return locale === "fr" && french?.trim() ? french : base;
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr";
}

/**
 * The full date line — "Saturday, 23 November 2026" / "Lundi 23 novembre 2026".
 *
 * French convention lower-cases weekdays and months, so Intl returns "lundi 23
 * novembre 2026". On an invitation the opening weekday reads better
 * capitalised, so lift that first letter; the month stays lower case, which is
 * still correct French. English already arrives capitalised and is unchanged.
 */
export function formatLongDate(date: Date, locale: Locale): string {
  const formatted = date.toLocaleDateString(DATE_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return capitaliseFirst(formatted, locale);
}

export function capitaliseFirst(value: string, locale: Locale): string {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase(DATE_LOCALE[locale]) + value.slice(1);
}
