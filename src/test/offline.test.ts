import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { canUseOffline, isPreviewHost, OFFLINE_PAGES } from "@/lib/pwa";
import { resolveAuth } from "@/lib/auth";

const published = { prod: true, inIframe: false, hostname: "kitanda-store-companion.lovable.app", search: "" };

describe("offline mode only runs in the published app", () => {
  it("runs on the published address", () => {
    expect(canUseOffline(published)).toBe(true);
  });

  it("never runs in the editor preview, an iframe, dev, or with ?sw=off", () => {
    expect(canUseOffline({ ...published, hostname: "id-preview--345497cb-c59d-477e-97c2-d60b7f12a733.lovable.app" })).toBe(false);
    expect(canUseOffline({ ...published, inIframe: true })).toBe(false);
    expect(canUseOffline({ ...published, prod: false })).toBe(false);
    expect(canUseOffline({ ...published, search: "?sw=off" })).toBe(false);
  });

  it("recognises every kind of Lovable preview host", () => {
    expect(isPreviewHost("preview--kitanda.lovable.app")).toBe(true);
    expect(isPreviewHost("project--345497cb-c59d-477e-97c2-d60b7f12a733-dev.lovable.app")).toBe(true);
    expect(isPreviewHost("abc.lovableproject.com")).toBe(true);
    expect(isPreviewHost("preview-v2--shop.example.com")).toBe(false);
  });

  it("pre-fetches every screen so each one opens without internet", () => {
    const screens = readdirSync("src/routes")
      .filter((f) => f.endsWith(".tsx") && !f.startsWith("__"))
      .map((f) => (f === "index.tsx" ? "/" : `/${f.replace(/\.tsx$/, "")}`));
    expect([...OFFLINE_PAGES].sort()).toEqual(screens.sort());
  });
});

describe("staying signed in without internet", () => {
  const remembered = { id: "u1", email: "celma@example.com" };

  it("keeps the last person signed in when the backend cannot be reached", () => {
    expect(resolveAuth(null, { unreachable: true, remembered })).toEqual({
      status: "signed_in",
      userId: "u1",
      email: "celma@example.com",
    });
  });

  it("signs out when the backend answers that there is no session", () => {
    expect(resolveAuth(null, { unreachable: false, remembered }).status).toBe("signed_out");
  });

  it("does not invent an account on a phone nobody signed in on", () => {
    expect(resolveAuth(null, { unreachable: true, remembered: null }).status).toBe("signed_out");
  });
});
