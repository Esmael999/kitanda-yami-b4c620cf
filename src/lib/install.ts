// ============ Install-on-the-phone helpers (pure, so they are testable) ============

export type InstallPlatform = "ios" | "android" | "other";

/**
 * Which phone the visitor is on. iPadOS 13+ hides the iPad name and reports
 * "Macintosh", so a touch-capable Safari on a Mac-shaped UA is an iPad.
 */
export function detectPlatform(userAgent: string, platform: string, maxTouchPoints: number): InstallPlatform {
  const iPadAsMac = /Macintosh/.test(userAgent) && /Safari/.test(userAgent) && maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(userAgent) || iPadAsMac) return "ios";
  if (/Android/.test(userAgent) || /Android/.test(platform)) return "android";
  return "other";
}

/** Hand-written steps for the phones that give no install button of their own. */
export function installSteps(platform: InstallPlatform): string[] {
  if (platform === "ios") {
    return [
      "Abra esta página no Safari.",
      "Toque no botão Partilhar (o quadrado com a seta a subir).",
      "Escolha “Adicionar ao ecrã principal”.",
    ];
  }
  if (platform === "android") {
    return [
      "Abra esta página no Chrome.",
      "Toque no menu ⋮ no canto de cima.",
      "Escolha “Adicionar ao ecrã inicial”.",
    ];
  }
  return ["Abra esta página no Chrome do telemóvel.", "Toque no menu ⋮.", "Escolha “Adicionar ao ecrã inicial”."];
}

/** True once the page is running as an installed app, with no browser bar. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = (window as Window & { navigator: Navigator & { standalone?: boolean } }).navigator
    .standalone;
  const reportsDisplayMode = typeof window.matchMedia === "function";
  const displayMode = reportsDisplayMode
    ? window.matchMedia("(display-mode: standalone)").matches
    : false;
  return Boolean(
    standalone || displayMode || document.referrer.startsWith("android-app://"),
  );
}

/** The browser's own install offer, kept only while it is still on offer. */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
