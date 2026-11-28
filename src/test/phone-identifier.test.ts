import {describe,it,expect} from "vitest";
import {phoneLoginEmail,displayContact,reservedLoginEmail} from "@/lib/phone";
describe("Phone account identifiers",()=>{
it("normalizes a number and keeps the synthetic address out of the UI",()=>{
const alias=phoneLoginEmail("+244 923 456 789");
expect(alias).toBe(phoneLoginEmail("923456789"));
expect(displayContact(alias)).toBe("+244923456789");
expect(reservedLoginEmail(alias)).toBe(true);
});
it("rejects invalid numbers and leaves ordinary email unchanged",()=>{expect(()=>phoneLoginEmail("123")).toThrow();expect(displayContact("a@example.com")).toBe("a@example.com");});
});