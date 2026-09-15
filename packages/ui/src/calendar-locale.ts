import type { Formatters, Labels } from "react-day-picker";
import type { createLocale } from "./locale.js";

/** Gregorian dates remain the data contract; Intl only changes their presentation. */
export function calendarLocale(locale: ReturnType<typeof createLocale>, timeZone?: string) {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale.code, { calendar: "gregory", timeZone, ...options }).format;
  const caption = format({ month: "long", year: "numeric" });
  const day = format({ dateStyle: "full" });
  const { t } = locale;
  const formatters: Partial<Formatters> = {
    formatCaption: caption,
    formatMonthDropdown: format({ month: "long" }),
    formatYearDropdown: format({ year: "numeric" }),
    formatDay: format({ day: "numeric" }),
    formatWeekdayName: format({ weekday: "short" }),
    formatWeekNumber: (week) => locale.number(week),
    formatWeekNumberHeader: () => t("weekNumberHeader"),
  };
  const labels: Partial<Labels> = {
    labelNext: () => t("nextMonth"),
    labelPrevious: () => t("previousMonth"),
    labelMonthDropdown: () => t("monthDropdown"),
    labelYearDropdown: () => t("yearDropdown"),
    labelGrid: caption,
    labelGridcell: day,
    labelDayButton: (date, modifiers) =>
      [modifiers.today && t("today"), day(date), modifiers.selected && t("selected")]
        .filter(Boolean)
        .join(", "),
    labelWeekday: format({ weekday: "long" }),
    labelWeekNumber: (week) => t("weekNumber", { week }),
    labelWeekNumberHeader: () => t("weekNumberHeader"),
  };
  return { formatters, labels };
}
