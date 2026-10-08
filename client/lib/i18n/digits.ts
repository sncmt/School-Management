const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * Bangla digits to ASCII ("০১৭১২" -> "01712"). Inputs accept both digit sets;
 * run this before sending numbers, phones and marks to the server.
 */
export const toAsciiDigits = (value: string) =>
  value.replace(/[০-৯]/g, (digit) => String(BANGLA_DIGITS.indexOf(digit)));
