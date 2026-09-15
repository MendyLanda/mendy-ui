import { defineLocale, type MendyMessages, type MendyLocale, useMendyLocale } from "@mendylanda/ui";
import { en } from "@mendylanda/ui/locales/en";
import { he } from "@mendylanda/ui/locales/he";

const complete: MendyMessages = he.messages;
const locale: MendyLocale = defineLocale({
  code: "fr-FR",
  direction: "ltr",
  messages: { search: "Rechercher" },
});
void [complete, locale, en];
defineLocale({
  code: "fr",
  direction: "ltr",
  messages: {
    // @ts-expect-error Unknown translation key.
    searchTypo: "Search",
  },
});
export function useTranslationTypeCheck() {
  const { t } = useMendyLocale();
  t("clearAll");
  t("searchField", { label: "Projects" });
  // @ts-expect-error Interpolated messages require their parameters.
  t("searchField");
  // @ts-expect-error Wrong parameter name.
  t("searchField", { name: "Projects" });
  // @ts-expect-error Unknown translation key.
  t("unknownMessage");
}
