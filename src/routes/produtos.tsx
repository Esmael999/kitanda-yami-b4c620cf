import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Package, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Card, EmptyState, Field, MoneyInput, NumberInput, PageHeader } from "@/components/app/ui";
import { updateLedger, useCloud, useLedger } from "@/lib/store";
import { ProfitNotice, ProfitValue } from "@/components/app/profit";
import { unitProfit, formatKz, isLowStock, LedgerError, newId, validateProduct, type Product } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { PhotoPicker, PhotoThumb } from "@/components/app/device-photo";
import { useDetail, writeDetail } from "@/lib/device-details";
import { can } from "@/lib/cloud-map";

type Search = { filtro?: "baixo" | "prejuizo" };

export const Route = createFileRoute("/produtos")({
  validateSearch: (s: Record<string, unknown>): Search =>
    s["filtro"] === "baixo" ? { filtro: "baixo" } : s["filtro"]==="prejuizo"?{filtro:"prejuizo"}:{},
  head: () => ({
    meta: [
      { title: "Produtos e stock — Kitanda Yami" },
      { name: "description", content: "Preços, custos e stock com alerta de stock baixo." },
      { property: "og:title", content: "Produtos e stock — Kitanda Yami" },
      { property: "og:description", content: "Preços, custos e stock com alerta de stock baixo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Products,
});

const blank: Omit<Product, "id"> = { name: "", price: 0, cost: 0, stock: 0, minStock: 5 };

function Products() {
  const state = useLedger();
  const t = useT();
  const { filtro } = Route.useSearch();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const list = state.products
    .filter((p) => filtro === "baixo" ? isLowStock(p) : filtro==="prejuizo"?unitProfit(p)<0:true)
    .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)) || a.name.localeCompare(b.name));
  const stockValue = state.products.reduce((s, p) => s + p.stock * p.cost, 0);
  const lowCount = state.products.filter(isLowStock).length;
  const lossCount=state.products.filter(p=>unitProfit(p)<0).length;

  return (
    <div>
      <PageHeader
        title={t("nav.products")}
        subtitle={`${state.products.length} produtos · stock vale ${formatKz(stockValue)}`}
        action={
          <Button variant="hero" size="icon-lg" aria-label={t("common.newProduct")} onClick={() => setCreating(true)}>
            <Plus />
          </Button>
        }
      />

      <div className="space-y-3 px-5">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.searchProduct")}
            className="h-12 rounded-xl pl-10 text-base"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/produtos"
            search={{}}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              !filtro ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            Todos
          </Link>
          <Link
            to="/produtos"
            search={{ filtro: "baixo" }}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              filtro === "baixo" ? "bg-debt text-debt-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            Stock baixo ({lowCount})
          </Link>
          <Link to="/produtos" search={{filtro:"prejuizo"}} className={cn("rounded-full px-4 py-1.5 text-sm font-medium",filtro==="prejuizo"?"bg-destructive text-destructive-foreground":"bg-destructive/10 text-destructive")}>Prejuízo ({lossCount})</Link>
        </div>
      </div>

      <div className="mt-4 space-y-2 px-5">
        {list.length === 0 ? (
          <EmptyState
            icon={<Package className="size-5" />}
            title={state.products.length ? "Nenhum produto encontrado" : "Ainda sem produtos"}
            text={state.products.length ? "Tente outra palavra." : "Adicione o que vende para registar vendas e controlar o stock."}
            action={
              !state.products.length && (
                <Button variant="hero" onClick={() => setCreating(true)}>
                  <Plus /> Adicionar produto
                </Button>
              )
            }
          />
        ) : (
          list.map((p) => {
            const low = isLowStock(p);
            return (
              <button key={p.id} onClick={() => setEditing(p)} className="block w-full text-left">
                <Card className={cn("flex items-center gap-3 py-3",unitProfit(p)<0&&"border-destructive/40")}>
                  <ProductThumb id={p.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground tabular">
                      {formatKz(p.price)} · <ProfitValue value={unitProfit(p)} unit/>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold tabular",
                      low ? "bg-debt-soft text-debt" : "bg-success-soft text-primary",
                    )}
                  >
                    {p.stock} em stock
                  </span>
                </Card>
              </button>
            );
          })
        )}
      </div>

      <ProductDrawer
        key={editing?.id ?? (creating ? "new" : "none")}
        open={creating || !!editing}
        product={editing}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    </div>
  );
}

function ProductThumb({ id }: { id: string }) {
  const { userId } = useCloud();
  const photo = useDetail(userId, `product:${id}`);
  return photo ? <PhotoThumb value={photo} className="size-12" /> : null;
}

function ProductDrawer({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}) {
  const t = useT();
  const [form, setForm] = useState<Omit<Product, "id">>(product ?? blank);
  const [restock, setRestock] = useState(0);
  const { userId, member } = useCloud();
  const oldPhoto = useDetail(userId, `product:${product?.id ?? "new"}`);
  const [photoEdit, setPhotoEdit] = useState<{ value: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = { ...form, name: form.name.trim(), stock: form.stock + restock };
      validateProduct(data);
      const id = product?.id ?? newId();
      if (photoEdit) {
        if (!userId || !can(member, "produtos")) throw new LedgerError("Sem permissão para guardar fotografia.");
        await writeDetail(userId, `product:${id}`, photoEdit.value);
      }
      updateLedger((s) => ({
        ...s,
        products: product
          ? s.products.map((p) => (p.id === product.id ? { ...data, id: p.id } : p))
          : [...s.products, { ...data, id }],
      }));
      if(unitProfit(data)<0)toast.warning("Produto guardado com preço abaixo do custo.");
      else toast.success(product ? "Produto actualizado" : "Produto adicionado");
      onClose();
    } catch (e) {
      toast.error(e instanceof LedgerError ? e.message : "Não foi possível guardar.");
    } finally { setSaving(false); }
  };

  const remove = () => {
    if (!product) return;
    if (!window.confirm(`Apagar "${product.name}"? As vendas antigas ficam guardadas.`)) return;
    updateLedger((s) => ({ ...s, products: s.products.filter((p) => p.id !== product.id) }));
    toast.success("Produto apagado");
    onClose();
  };

  return (
    <Drawer open={open} dismissible={!saving} onOpenChange={(o) => !o && !saving && onClose()}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle>{product ? "Editar produto" : "Novo produto"}</DrawerTitle>
          <DrawerDescription>Preços em Kwanzas.</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto px-4">
          {can(member, "produtos") && <PhotoPicker value={photoEdit ? photoEdit.value : oldPhoto} disabled={saving} onChange={value => setPhotoEdit({ value })} />}
          <Field label={t("common.name")} htmlFor="p-name">
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: Arroz 1kg"
              className="h-12 rounded-xl text-base"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("common.price")} htmlFor="p-price">
              <MoneyInput id="p-price" value={form.price} onChange={(v) => set("price", v)} />
            </Field>
            <Field label="Custo" htmlFor="p-cost">
              <MoneyInput id="p-cost" value={form.cost} onChange={(v) => set("cost", v)} />
            </Field>
          </div>
          {form.price > 0 && <ProfitNotice value={unitProfit(form)} unit/>}
          <div className="grid grid-cols-2 gap-3">
            <Field label={product ? "Stock actual" : "Stock inicial"} htmlFor="p-stock">
              <NumberInput id="p-stock" value={form.stock} onChange={(v) => set("stock", v)} />
            </Field>
            <Field label="Avisar quando ≤" htmlFor="p-min">
              <NumberInput id="p-min" value={form.minStock} onChange={(v) => set("minStock", v)} />
            </Field>
          </div>
          {product && (
            <div className="rounded-2xl bg-secondary p-3">
              <p className="text-sm font-medium">Repor stock (chegou mercadoria)</p>
              <div className="mt-2 flex items-center gap-3">
                <Button variant="outline" size="icon-lg" aria-label="Menos" onClick={() => setRestock((r) => Math.max(0, r - 1))}>
                  <Minus />
                </Button>
                <span className="flex-1 text-center text-2xl font-bold tabular">+{restock}</span>
                <Button variant="outline" size="icon-lg" aria-label="Mais" onClick={() => setRestock((r) => r + 1)}>
                  <Plus />
                </Button>
              </div>
              <div className="mt-2 flex gap-2">
                {[6, 12, 24].map((n) => (
                  <Button key={n} variant="soft" size="sm" className="flex-1" onClick={() => setRestock((r) => r + n)}>
                    +{n}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DrawerFooter>
          <Button variant="hero" size="xl" disabled={saving} onClick={() => void save()}>
            {saving ? "A guardar…" : "Guardar"}
          </Button>
          {product && (
            <Button variant="ghost" className="text-destructive" disabled={saving} onClick={remove}>
              <Trash2 /> Apagar produto
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
