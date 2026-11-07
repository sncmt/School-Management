const EN_SIGN = "TK";   // change to "Tk" here and every English screen follows

export const currencySign = (locale: string) => (locale === "bn" ? "৳" : EN_SIGN);

export const withSign = (locale: string, formatted: string) =>
  locale === "bn" ? `৳${formatted}` : `${EN_SIGN}\u00A0${formatted}`;