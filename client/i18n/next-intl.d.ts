import type messages from "../messages/en.json";
import type { Locale } from "./config";

// Typed keys: a missing or misspelled translation key is a type error.
// en.json is the source of truth; bn.json must have the same keys.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
