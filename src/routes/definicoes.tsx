import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, CloudUpload, Download, Loader2, LogOut, Trash2, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Field, PageHeader } from "@/components/app/ui";
import { signOut, useAuth } from "@/lib/auth";
import { setBusinessType, updateLedger, useCloud, useLedger } from "@/lib/store";
import { initialBusinessName, type BusinessType } from "@/lib/business";
import { emptyState, type LedgerState } from "@/lib/ledger";
import { useT } from "@/lib/i18n";
import { useThemePreference } from "@/lib/theme";
import { PhotoPicker } from "@/components/app/device-photo";
import { clearDetails, useDetail, writeDetail } from "@/lib/device-details";
import { BusinessPicker } from "@/components/app/business-picker";
import { LanguagePicker } from "@/components/app/language-picker";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export const Route = createFileRoute("/definicoes")({
  head: () => ({
    meta: [
      { title: "Definições — Kitanda Yami" },
      { name: "description", content: "Dados do negócio e cópia de segurança." },
      { property: "og:title", content: "Definições — Kitanda Yami" },
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
  const [theme, setTheme] = useThemePreference();
  const [business, setBusiness] = useState(state.settings.businessName);
  const [owner, setOwner] = useState(state.settings.ownerName);
  const fileRef = useRef<HTMLInputElement>(null);
  const auth = useAuth();
  const { member, pending, failed, userId } = useCloud();
  const profilePhoto = useDetail(userId, "business-photo");
  const customCategory = useDetail(userId, "business-category");
  const [category, setCategory] = useState("");
  const [detailsBusy, setDetailsBusy] = useState(false);
  const saveDetail = async (key: string, value: string | null) => {
    if (!userId || member?.role !== "owner" || !member.active || detailsBusy) return;
    setDetailsBusy(true);
    try { await writeDetail(userId, key, value); toast.success("Guardado neste dispositivo"); }
    catch { toast.error("Não foi possível guardar neste dispositivo."); }
    finally { setDetailsBusy(false); }
  };
  const [changingType, setChangingType] = useState(false);
  const [pendingType, setPendingType] = useState<BusinessType | null>(null);
  const saveType = async () => {
    if (!pendingType || changingType || member?.role !== "owner" || !member.active) return;
    setChangingType(true);
    try { await setBusinessType(pendingType); setPendingType(null); toast.success("Tipo de negócio guardado"); }
    catch { toast.error("Não foi possível guardar. Verifique a ligação à internet."); }
    finally { setChangingType(false); }
  };
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(false);
  const navigate = useNavigate();

  const leave = async () => {
    if (leaving) return;
    setLeaving(true);
    setLeaveError(false);
    try {
      const { error } = await signOut();
      if (error) {
        setLeaveError(true);
        return;
      }
      await navigate({ to: "/entrar", replace: true });
    } catch {
      setLeaveError(true);
    } finally {
      setLeaving(false);
    }
  };

  const save = () => {
    updateLedger((s) => ({
      ...s,
      settings: { businessName: business.trim() || initialBusinessName(owner), ownerName: owner.trim() },
    }));
    toast.success(t("settings.saved"));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kitanda-copia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(t("settings.exported"));
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as LedgerState;
      if (!Array.isArray(data.products) || !Array.isArray(data.sales)) throw new Error();
      if (!window.confirm(t("settings.restoreConfirm"))) return;
      updateLedger(() => ({ ...emptyState(), ...data }));
      setBusiness(data.settings?.businessName ?? "");
      setOwner(data.settings?.ownerName ?? "");
      toast.success(t("settings.restored"));
    } catch {
      toast.error(t("settings.invalidBackup"));
    }
  };

  const wipe = async () => {
    if (!window.confirm(t("settings.eraseConfirm"))) return;
    try { if (userId) await clearDetails(userId); } catch { toast.error("Não foi possível apagar os dados locais adicionais."); return; }
    // Only this phone's copy: the cloud keeps everything and brings it back on the next sync.
    updateLedger(() => emptyState(), []);
    setBusiness(emptyState().settings.businessName);
    setOwner("");
    toast.success(t("settings.erased"));
  };

  return (
    <div>
      <PageHeader title={t("page.settings")} back="/mais" />
      <div className="space-y-4 px-5">
        <Card>
          <LanguagePicker />
        </Card>
        <Card className="space-y-2">
          <p className="font-semibold">{t("settings.appearance")}</p>
          <div role="group" aria-label={t("settings.theme")} className="grid grid-cols-2 gap-2">
            <Button variant={theme === "dark" ? "hero" : "soft"} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>{t("settings.dark")}</Button>
            <Button variant={theme === "light" ? "hero" : "soft"} aria-pressed={theme === "light"} onClick={() => setTheme("light")}>{t("settings.light")}</Button>
          </div>
        </Card>

        <Card className="space-y-3">
          {member?.role === "owner" && member.active && <PhotoPicker profile value={profilePhoto} disabled={detailsBusy} onChange={value => void saveDetail("business-photo", value)} />}
          <Field label={t("settings.businessName")} htmlFor="s-business">
            <Input id="s-business" value={business} onChange={(e) => setBusiness(e.target.value)} className="h-12 rounded-xl text-base" />
          </Field>
          <Field label={t("settings.ownerName")} htmlFor="s-owner" hint={t("settings.greetingHint")}>
            <Input id="s-owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="h-12 rounded-xl text-base" />
          </Field>
          <Button variant="hero" size="xl" className="w-full" onClick={save}>
            {t("action.save")}
          </Button>
        </Card>

        {member?.role === "owner" && member.active && <Card className="space-y-3">
          <div>
            <p className="font-semibold">Tipo de negócio</p>
            <p className="text-sm text-muted-foreground">Escolha a categoria que descreve a sua actividade. Qualquer tipo de negócio pode ter ajudantes. Os produtos, vendas e dívidas ficam como estão.</p>
          </div>
          {customCategory && <p className="rounded-xl bg-secondary p-3 text-sm">Categoria personalizada: <strong>{customCategory}</strong></p>}
          <BusinessPicker value={pendingType ?? member.businessType ?? "cantina"} onChange={setPendingType} />
          <Button variant="hero" className="w-full" disabled={changingType || !pendingType || pendingType === member.businessType} onClick={() => void saveType()}>{changingType ? "A guardar…" : t("action.save")}</Button>
          <div className="border-t pt-3 space-y-2">
            <Field label="Criar o meu tipo de negócio" htmlFor="custom-category" hint="Personalização da versão de teste, guardada neste dispositivo. Não altera permissões.">
              <Input id="custom-category" maxLength={80} value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex.: Oficina de reparação" />
            </Field>
            <Button variant="soft" className="w-full" disabled={!category.trim() || detailsBusy} onClick={() => void saveDetail("business-category", category.trim())}>Guardar categoria personalizada</Button>
            {customCategory && <Button variant="ghost" className="w-full" disabled={detailsBusy} onClick={() => void saveDetail("business-category", null)}>Usar apenas categoria padrão</Button>}
          </div>
        </Card>}
        <Card className="space-y-3">
          <div>
            <p className="font-semibold">{t("settings.backup")}</p>
            <p className="text-sm text-muted-foreground">
              {t("settings.backupHint")}
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

        <Button variant="ghost" className="w-full text-destructive" onClick={() => void wipe()}>
          <Trash2 /> Apagar todos os dados
        </Button>

        <section aria-labelledby="account-heading" className="border-t pt-5 pb-4">
          <h2 id="account-heading" className="mb-4 text-sm font-semibold text-muted-foreground">{t("account.title")}</h2>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary"><UserRound className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold break-words">{state.settings.ownerName || state.settings.businessName}</p>
              <p className="text-sm break-all text-muted-foreground">{auth.email}</p>
              {member && <p className="mt-1 text-xs text-muted-foreground">{t(member.role === "owner" ? "account.owner" : "account.employee")}</p>}
            </div>
          </div>
          <Button variant="outline" className="h-12 w-full justify-start gap-3 text-destructive" onClick={() => { setLeaveError(false); setLeaveOpen(true); }}>
            <LogOut /> {t("account.signOut")} <ChevronRight className="ml-auto" />
          </Button>
        </section>
      </div>
      <Drawer open={leaveOpen} onOpenChange={(open) => { if (!leaving) setLeaveOpen(open); }} dismissible={!leaving}>
        <DrawerContent className="mx-auto max-w-md pb-safe">
          <DrawerHeader className="px-5 pt-5 text-left sm:text-left">
            <span className="mb-3 grid size-12 place-items-center rounded-full bg-secondary text-destructive"><LogOut className="size-6" /></span>
            <DrawerTitle className="leading-snug tracking-normal">{t("account.confirmTitle")}</DrawerTitle>
            <DrawerDescription className="mt-2 leading-relaxed">{t("account.confirmHint")}</DrawerDescription>
          </DrawerHeader>
          {(pending > 0 || failed.length > 0) && <div className="mx-5 flex items-start gap-3 rounded-lg border bg-secondary p-3 text-sm text-secondary-foreground"><CloudUpload className="mt-0.5 size-5 shrink-0" /><p>{t("account.pendingHint")}</p></div>}
          {leaveError && <p role="alert" className="px-5 text-sm text-destructive">{t("account.error")}</p>}
          <DrawerFooter className="px-5 pb-5">
            <Button variant="destructive" className="h-12 w-full" disabled={leaving} onClick={() => void leave()}>
              {leaving ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <LogOut />}
              {t(leaving ? "account.leaving" : "account.signOut")}
            </Button>
            <Button variant="outline" className="h-12 w-full" disabled={leaving} autoFocus onClick={() => setLeaveOpen(false)}>{t("account.stay")}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
