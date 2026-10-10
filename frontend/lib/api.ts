let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Request failed. Please try again." }));
    throw new ApiError(
      typeof error.detail === "string"
        ? error.detail
        : "Please check the form fields and try again.",
      response.status,
    );
  }
  return response.json();
}
export const money = (
  value: number | null,
  currency = "INR",
  compact = false,
) =>
  value === null
    ? "Not provided"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
        ...(compact ? { notation: "compact" as const } : {}),
      }).format(value);
export function utc(value: string) {
  return new Date(/Z$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + "Z");
}
export function date(value: string, withTime = false) {
  return utc(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
}
