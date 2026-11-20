import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, LogOut, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Field, PageHeader } from "@/components/app/ui";
import { signOut, useAuth } from "@/lib/auth";
import { updateLedger, useLedger } from "@/lib/store";
import { emptyState, type LedgerState } from "@/lib/ledger";
import { useT } from "@/lib/i18n";
import { LanguagePicker } from "@/components/app/language-picker";

export const Route = createFileRoute("/definicoes")({
  head: () => ({
    meta: [
      { title: "Definições — Kitanda" },
      { name: "description", content: "Dados do negócio e cópia de segurança." },
      { property: "og:title", content: "Definições — Kitanda" },
      { property: "og:description", content: "Dados do negócio e cópia de segurança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const state = useLedger();
  const t = useT();
  const [business, setBusiness] = useState(state.settings.businessName);
  const [owner, setOwner] = useState(state.settings.ownerName);
  const fileRef = useRef<HTMLInputElement>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  const leave = async () => {
    if (!window.confirm("Sair da conta neste telemóvel?")) return;
    await signOut();
    await navigate({ to: "/entrar" });
  };

  const save = () => {
    updateLedger((s) => ({
      ...s,
      settings: { businessName: business.trim() || "A minha cantina", ownerName: owner.trim() },
    }));
    toast.success("Definições guardadas");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kitanda-copia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Cópia de segurança descarregada");
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as LedgerState;
      if (!Array.isArray(data.products) || !Array.isArray(data.sales)) throw new Error();
      if (!window.confirm("Substituir os dados deste telemóvel pela cópia?")) return;
      updateLedger(() => ({ ...emptyState(), ...data }));
      setBusiness(data.settings?.businessName ?? "");
      setOwner(data.settings?.ownerName ?? "");
      toast.success("Dados restaurados");
    } catch {
      toast.error("Este ficheiro não é uma cópia da Kitanda.");
    }
  };

  const wipe = () => {
    if (!window.confirm("Apagar TODOS os dados deste telemóvel? Não dá para desfazer.")) return;
    // Only this phone's copy: the cloud keeps everything and brings it back on the next sync.
    updateLedger(() => emptyState(), []);
    setBusiness(emptyState().settings.businessName);
    setOwner("");
    toast.success("Todos os dados foram apagados");
  };

  return (
    <div>
      <PageHeader title={t("page.settings")} back="/mais" />
      <div className="space-y-4 px-5">
        <Card>
          <LanguagePicker />
        </Card>

        <Card className="space-y-3">
          <Field label="Nome do negócio" htmlFor="s-business">
            <Input id="s-business" value={business} onChange={(e) => setBusiness(e.target.value)} className="h-12 rounded-xl text-base" />
          </Field>
          <Field label="O seu nome" htmlFor="s-owner" hint="Aparece na saudação do início.">
            <Input id="s-owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="h-12 rounded-xl text-base" />
          </Field>
          <Button variant="hero" size="xl" className="w-full" onClick={save}>
            {t("action.save")}
          </Button>
        </Card>

        <Card className="space-y-3">
          <div>
            <p className="font-semibold">A sua conta</p>
            <p className="text-sm text-muted-foreground">
              {auth.email || "Sem email ligado."} As vendas que registar ficam guardadas na sua conta e
              aparecem em qualquer telemóvel onde entrar.
            </p>
          </div>
          <Button variant="soft" className="w-full" onClick={leave}>
            <LogOut /> Sair da conta
          </Button>
        </Card>

        <Card className="space-y-3">
          <div>
            <p className="font-semibold">Cópia de segurança</p>
            <p className="text-sm text-muted-foreground">
              Além do que fica na sua conta, guarde uma cópia neste telemóvel de vez em quando, para
              não perder nada se trocar de telemóvel.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="soft" onClick={exportData}>
              <Download /> Guardar cópia
            </Button>
            <Button variant="soft" onClick={() => fileRef.current?.click()}>
              <Upload /> Restaurar
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importData(f);
              e.target.value = "";
            }}
          />
        </Card>

        <Button variant="ghost" className="w-full text-destructive" onClick={wipe}>
          <Trash2 /> Apagar todos os dados
        </Button>
      </div>
    </div>
  );
}
