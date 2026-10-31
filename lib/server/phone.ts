/**
 * Dutch mobile numbers only, for now. Calls to German numbers do not work on our line yet, and a mobile number is what a
 * visitor expects to be called on. Anything that is not clearly a normal Dutch mobile number is refused.
 */
export function normalizeDutchMobile(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let digits = input.replace(/[\s().-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `31${digits.slice(1)}`;
  else return null;
  if (!/^\d+$/.test(digits)) return null;
  // +31 6 followed by 8 digits; 06760... is the voicemail range and not a person
  if (!/^316\d{8}$/.test(digits)) return null;
  if (digits.startsWith("316760")) return null;
  return `+${digits}`;
}
