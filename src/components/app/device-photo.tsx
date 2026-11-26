import { useState } from "react";
import { Camera, UserRound, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)
    throw new Error("Escolha uma fotografia JPG, PNG ou WebP até 10 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível abrir a fotografia."));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Fotografia inválida.");
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar a fotografia.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally { URL.revokeObjectURL(url); }
}
export function PhotoThumb({ value, profile = false, className = "" }: { value: string | null; profile?: boolean; className?: string }) {
  const Icon = profile ? UserRound : Package;
  return <span className={`grid shrink-0 place-items-center overflow-hidden bg-secondary text-primary ${profile ? "rounded-full" : "rounded-xl"} ${className}`}>
    {value ? <img src={value} alt="" className="size-full object-cover" /> : <Icon className="size-5" />}
  </span>;
}
export function PhotoPicker({ value, onChange, profile = false, disabled = false }: { value: string | null; onChange: (v: string | null) => void; profile?: boolean; disabled?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="space-y-2">
    <p className="text-sm font-medium">{profile ? "Fotografia do negócio" : "Fotografia do produto"}</p>
    <div className="flex items-center gap-3">
      <PhotoThumb value={value} profile={profile} className="size-16" />
      <div className="min-w-0 flex-1">
        <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-secondary px-3 text-sm font-medium ${disabled || busy ? "pointer-events-none opacity-50" : ""}`}>
          <Camera className="size-4" /> {busy ? "A preparar…" : value ? "Trocar fotografia" : "Escolher fotografia"}
          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher fotografia" className="sr-only" disabled={disabled || busy} onChange={async e => {
            const file = e.currentTarget.files?.[0]; e.currentTarget.value = "";
            if (!file) return;
            setBusy(true); setError("");
            try { onChange(await preparePhoto(file)); } catch (e) { setError(e instanceof Error ? e.message : "Erro ao abrir fotografia."); }
            finally { setBusy(false); }
          }} />
        </label>
        {value && <Button type="button" variant="ghost" size="sm" disabled={disabled || busy} onClick={() => onChange(null)}>Remover</Button>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground">A fotografia fica guardada neste dispositivo.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
