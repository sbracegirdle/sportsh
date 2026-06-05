export function formatHeadingDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatEventTime(value: string | undefined, referenceDate: Date): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (sameLocalDate(date, referenceDate)) {
    return time;
  }

  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);

  return `${day}, ${time}`;
}

/** Formats a schedule entry's `when`, accepting either a date-only string or a full datetime. */
export function formatScheduleWhen(value: string | undefined, referenceDate: Date): string {
  if (!value) {
    return "TBC";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date);
  }

  return formatEventTime(value, referenceDate) ?? value;
}

/** Compares an entry's day against the reference day. */
export function dayTag(value: string | undefined, referenceDate: Date): "done" | "today" | "" {
  if (!value) {
    return "";
  }
  const key = value.slice(0, 10);
  const refKey = referenceDate.toISOString().slice(0, 10);
  if (key < refKey) {
    return "done";
  }
  return key === refKey ? "today" : "";
}

function sameLocalDate(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}
