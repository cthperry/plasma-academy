const RFC3339_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const EVIDENCE_REFERENCE = /^docs\/reviews\/evidence\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:json|md|pdf|txt)$/;

export function isValidRfc3339DateTime(value) {
  if (typeof value !== "string") return false;
  const match = value.match(RFC3339_DATE_TIME);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText = "0", offsetMinuteText = "0"] = match;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText].map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12
    && day >= 1 && day <= daysInMonth
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 23
    && offsetMinute <= 59;
}

export function isEvidenceReference(value) {
  return typeof value === "string" && EVIDENCE_REFERENCE.test(value) && !value.includes("../");
}
