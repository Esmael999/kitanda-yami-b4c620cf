/** Angolan mobile numbers: accept national or international input; always use E.164 in Auth. */
export function angolanPhone(value: string): string | null {
  const clean = value.trim().replace(/[\s().-]/g, "");
  const national = clean.replace(/^(?:\+244|00244|244)(?=9\d{8}$)/, "");
  return /^9\d{8}$/.test(national) ? "+244" + national : null;
}
export const MIN_PASSWORD_LENGTH = 6;

/** Phone is a login identifier, not proof of ownership. No messages are sent to this reserved domain. */
export function phoneLoginEmail(value:string):string {
  const phone=angolanPhone(value);
  if(!phone)throw new Error("Introduza um número angolano válido.");
  return "p"+phone.slice(1)+"@phone.kitanda.invalid";
}
export function displayContact(value:string):string {
  const match=/^p(2449\d{8})@phone\.kitanda\.invalid$/i.exec(value);
  return match?"+"+match[1]:value;
}
export function reservedLoginEmail(value:string):boolean {
  return value.trim().toLowerCase().endsWith("@phone.kitanda.invalid");
}
