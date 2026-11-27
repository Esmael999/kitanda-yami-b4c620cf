import { describe,it,expect } from "vitest";
import { visitorAvailable } from "@/lib/visitor";
describe("local visitor isolation",()=>{
  it("only enables the preview host",()=>{
    expect(visitorAvailable("deploy-preview-2--kitanda-yami.netlify.app")).toBe(true);
    expect(visitorAvailable("kitanda-yami.netlify.app")).toBe(false);
    expect(visitorAvailable("deploy-preview-2--kitanda-yami.netlify.app.example.com")).toBe(false);
  });
});
