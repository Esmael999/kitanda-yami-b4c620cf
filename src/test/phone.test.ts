import { describe, expect, it } from "vitest";
import { angolanPhone, MIN_PASSWORD_LENGTH } from "@/lib/phone";
describe("Angolan mobile authentication", () => {
  it("normalizes national and international numbers", () => {
    for (const value of ["923456789", "+244 923 456 789", "00244923456789", "244923456789"])
      expect(angolanPhone(value)).toBe("+244923456789");
  });
  it("rejects invalid, short and foreign numbers", () => {
    for (const value of ["", "92345678", "+351923456789", "223456789", "923456789a"])
      expect(angolanPhone(value)).toBeNull();
  });
  it("keeps the six-character minimum", () => expect(MIN_PASSWORD_LENGTH).toBe(6));
});
