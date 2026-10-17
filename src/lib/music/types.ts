export type Locale = "ar" | "fr" | "en";
export type Localized = Record<Locale, string>;

/** Where a piece of musical data comes from and whether a musician has checked it. */
export type Provenance = {
  source: string;
  status: "draft" | "reviewed";
  tradition?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
};
