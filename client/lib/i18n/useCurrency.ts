import { useFormatter, useLocale } from "next-intl";
import { useCallback } from "react";
import { currencySign, withSign } from "./currency";


// "TK" is wider than "৳", so inputs that show the sign inside the box need more left padding
export const useCurrencySign = () => {
  const locale = useLocale();
  const bn = locale === "bn";
  return { sign: currencySign(locale), pad: bn ? "pl-7" : "pl-10", padSm: bn ? "pl-6" : "pl-8" };
};

/** An amount as money in the current language: taka(1250) -> "৳১,২৫০" in Bangla, "TK 1,250" in English. */
export const useTaka = () => {
  const locale = useLocale();
  const format = useFormatter();
  return useCallback(
    (value: number) => withSign(locale, format.number(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })),
    [locale, format],
  );
};