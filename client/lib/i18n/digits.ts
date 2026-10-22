const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * Bangla digits to ASCII ("০১৭১২" -> "01712"). Inputs accept both digit sets;
 * run this before sending numbers, phones and marks to the server.
 */
export const toAsciiDigits = (value: string) =>
  value.replace(/[০-৯]/g, (digit) => String(BANGLA_DIGITS.indexOf(digit)));

/** ASCII digits to Bangla ("01712" -> "০১৭১২"). */
export const toBanglaDigits = (value: string) => value.replace(/[0-9]/g, (digit) => BANGLA_DIGITS[Number(digit)]);

/*
 * A piece of text that must keep its ASCII digits, because people copy or type it elsewhere
 * exactly: an email, a web address or domain, or a code mixing Latin letters and digits
 * (a password, a bKash TrxID, "1st").
 */
const keepsAsciiDigits = (token: string) => /[A-Za-z]/.test(token) || token.includes("@") || token.includes("://");

/**
 * Text as shown in Bangla: digits in Bangla, word by word, except in words that must keep
 * their ASCII digits ("ভর্তি নং 20270001" -> "ভর্তি নং ২০২৭০০০১", but "TrxID 8N7A6D" stays).
 */
export const localizeDigits = (text: string) =>
  /[0-9]/.test(text) ? text.replace(/\S+/g, (token) => (/[0-9]/.test(token) && !keepsAsciiDigits(token) ? toBanglaDigits(token) : token)) : text;
