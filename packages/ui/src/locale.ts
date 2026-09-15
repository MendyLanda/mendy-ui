import { en, englishMessages } from "./locales/en.js";

/** Dictionaries are plain data, including when passed across a server/client boundary. */
export type MendyMessages = { [K in keyof typeof englishMessages]: string };
export interface MendyLocale {
  /** BCP 47 language tag used by Intl. */
  code: string;
  direction: "ltr" | "rtl";
  messages: MendyMessages;
  /** Gregorian calendar week convention; Sunday by default. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  firstWeekContainsDate?: 1 | 4;
}
/** Missing messages fall back to English; private locales need no registration. */
export function defineLocale(
  locale: Omit<MendyLocale, "messages"> & {
    messages?: Partial<MendyMessages>;
  },
): MendyLocale {
  return { ...locale, messages: { ...englishMessages, ...locale.messages } };
}
type Placeholders<S extends string> = S extends `${string}{${infer P}}${infer Rest}`
  ? P | Placeholders<Rest>
  : never;
type Params<K extends keyof MendyMessages> = Placeholders<(typeof englishMessages)[K]>;
export type Translate = <K extends keyof MendyMessages>(
  key: K,
  ...args: [Params<K>] extends [never] ? [] : [Record<Params<K>, string | number>]
) => string;

export function createLocale(locale: MendyLocale = en) {
  const numbers = new Intl.NumberFormat(locale.code);
  const dates = new Intl.DateTimeFormat(locale.code, {
    calendar: "gregory",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const t: Translate = (key, ...args) => {
    const params = args[0] as Record<string, string | number> | undefined;
    return (locale.messages[key] ?? englishMessages[key]).replace(
      /\{(\w+)\}/g,
      (token, name: string) => {
        const value = params?.[name];
        return value === undefined
          ? token
          : typeof value === "number"
            ? numbers.format(value)
            : value;
      },
    );
  };
  return { ...locale, t, number: numbers.format, date: dates.format };
}
