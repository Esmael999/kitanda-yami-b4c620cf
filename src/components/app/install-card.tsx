import { useEffect, useState } from "react";
import { CheckCircle2, Download, Smartphone, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/app/ui";
import {
  detectPlatform,
  installSteps,
  isStandalone,
  type InstallPlatform,
  type InstallPromptEvent,
} from "@/lib/install";

/**
 * The one place that offers “put Kitanda on the home screen”.
 * Uses the browser's own install offer when it has one, and the hand-written
 * steps when the phone (iPhone) never offers a button.
 */
export function InstallCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("other");

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setPlatform(detectPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints));
    const onOffer = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onOffer);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onOffer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  }

  return (
    <Card className="mt-4 bg-success-soft">
      <div className="flex items-center gap-2 font-semibold">
        <Smartphone className="size-4 text-primary" /> A app no ecrã do telemóvel
      </div>

      {installed ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          Já está instalada neste telemóvel. Abra a Kitanda pelo ícone.
        </p>
      ) : prompt ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Tenha a Kitanda no ecrã inicial: abre sem barra do browser, como qualquer app.
          </p>
          <Button className="mt-3 w-full" variant="hero" size="lg" onClick={install}>
            <Download /> Instalar a app
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">Para abrir como app, sem barra do browser:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {installSteps(platform).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      )}
      <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
        <WifiOff className="mt-0.5 size-4 shrink-0 text-primary" />
        Funciona sem internet: abra uma vez com rede e depois pode vender offline. Tudo é enviado quando a rede voltar.
      </p>
    </Card>
  );
}
