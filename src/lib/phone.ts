/** Angolan mobile numbers: accept national or international input; always use E.164 in Auth. */
export function angolanPhone(value: string): string | null {
  const clean = value.trim().replace(/[\s().-]/g, "");
  const national = clean.replace(/^(?:\+244|00244|244)(?=9\d{8}$)/, "");
  return /^9\d{8}$/.test(national) ? "+244" + national : null;
}
export const MIN_PASSWORD_LENGTH = 6;
