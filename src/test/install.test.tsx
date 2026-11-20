import { existsSync, readFileSync } from "node:fs";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { InstallCard } from "@/components/app/install-card";
import { detectPlatform, installSteps } from "@/lib/install";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));

/** PNG width/height live in the header, so the file cannot claim a size it lacks. */
function pngSize(path: string) {
  const bytes = readFileSync(path);
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

describe("Kitanda como app no telemóvel", () => {
  const router = () => createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("abre pelo ícone como app, sem barra do browser", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.short_name).toBe("Kitanda Yami");
  });

  it("só promete ícones que existem e têm o tamanho que dizem", () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      const file = `public${icon.src}`;
      expect(existsSync(file), file).toBe(true);
      expect(pngSize(file), file).toBe(icon.sizes);
    }
  });

  it("tem ícone para a forma normal e para a forma recortada do ecrã inicial", () => {
    const purposes: string[] = manifest.icons.map((icon: { purpose?: string }) => icon.purpose ?? "any");
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");
  });

  it("dá atalhos do ícone para páginas que existem", () => {
    const urls: string[] = manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url);
    expect(urls).toEqual(["/vender", "/dividas", "/produtos"]);
    for (const url of urls) {
      expect(router().matchRoutes(url).at(-1)?.routeId).not.toBe(rootRouteId);
    }
  });

  it("explica ao iPhone como pôr o ícone no ecrã, em português", () => {
    const platform = detectPlatform(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "iPhone",
      5,
    );
    expect(platform).toBe("ios");
    expect(installSteps(platform).join(" ")).toContain("Adicionar ao ecrã principal");
  });

  it("explica ao Android como pôr o ícone no ecrã, em português", () => {
    const platform = detectPlatform(
      "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Linux armv8l",
      5,
    );
    expect(platform).toBe("android");
    expect(installSteps(platform).join(" ")).toContain("Adicionar ao ecrã inicial");
  });

  it("mostra o botão de instalar quando o browser o oferece", () => {
    render(<InstallCard />);
    expect(screen.queryByRole("button", { name: /Instalar a app/ })).toBeNull();

    act(() => {
      window.dispatchEvent(new Event("beforeinstallprompt"));
    });

    expect(screen.getByRole("button", { name: /Instalar a app/ })).toBeInTheDocument();
  });
});
