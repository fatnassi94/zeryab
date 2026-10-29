/**
 * The club's public contact details, shown in the footer, the contact page and
 * the privacy policy. Empty values are not shown (a placeholder stands in).
 */
export const CLUB = {
  email: "",
  phone: "",
  address: "",
};

/** The address people write to about their data (a visible placeholder until it is set). */
export const contactEmail = () => CLUB.email || "[email]";
