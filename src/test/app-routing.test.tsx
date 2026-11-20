import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { authMessage, isAuthPage } from "@/lib/auth";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  const router = () => createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches a page for / instead of falling back to not found", () => {
    const matches = router().matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("has a real sign-in page at /entrar", () => {
    const matches = router().matchRoutes("/entrar");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("keeps only /entrar open to someone without an account", () => {
    expect(isAuthPage("/entrar")).toBe(true);
    expect(isAuthPage("/")).toBe(false);
    expect(isAuthPage("/vender")).toBe(false);
  });

  it("answers a failed login in Portuguese, not in the backend's English", () => {
    expect(authMessage({ message: "Invalid login credentials" })).toBe("Email ou palavra-passe errados.");
    expect(authMessage({ message: "Password should be at least 6 characters" })).toBe(
      "A palavra-passe tem de ter pelo menos 6 letras.",
    );
  });
});
