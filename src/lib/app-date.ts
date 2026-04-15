const DEFAULT_APP_TIME_ZONE = "Europe/Warsaw";

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function parseDateString(date: string) {
  const match = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/.exec(date);

  if (!match?.groups) {
    throw new Error(`Invalid date string: ${date}`);
  }

  return {
    year: Number(match.groups.year),
    month: Number(match.groups.month),
    day: Number(match.groups.day),
  };
}

export function getAppTimeZone() {
  return process.env.APP_TIME_ZONE ?? DEFAULT_APP_TIME_ZONE;
}

export function getDateStringInTimeZone(date: Date, timeZone = getAppTimeZone()) {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    throw new Error(`Unable to format date for time zone ${timeZone}`);
  }

  return formatDateParts({ year, month, day });
}

export function getTodayDateString(timeZone = getAppTimeZone()) {
  return getDateStringInTimeZone(new Date(), timeZone);
}

export function addDaysToDateString(date: string, days: number) {
  const { year, month, day } = parseDateString(date);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));

  return formatDateParts({
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
  });
}
