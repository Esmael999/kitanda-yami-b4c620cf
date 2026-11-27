import { useEffect, useState } from "react";
import { Activity as ActivityIcon, RefreshCw, ShoppingBag, HandCoins, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/app/ui";
import { formatKz } from "@/lib/ledger";
import { getTeamActivity, type Activity } from "@/lib/team-invite";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";

export function TeamActivity({ helper, onClose }: { helper:{id:string;name:string;job_title?:string}; onClose:()=>void }) {
  const [days,setDays]=useState<1|7|30>(7);
  const [revision,setRevision]=useState(0);
  const [data,setData]=useState<Activity|null>(null);
  const [error,setError]=useState(false);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    setLoading(true);setError(false);setData(null);
    void getTeamActivity(helper.id,days).then(result=>{if(active)setData(result);}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[helper.id,days,revision]);
  return <Drawer open onOpenChange={open=>{if(!open)onClose();}}>
    <DrawerContent className="mx-auto max-h-[92dvh] max-w-md pb-safe">
      <DrawerHeader className="px-5 text-left">
        <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-accent text-primary"><ActivityIcon className="size-6"/></span>
        <DrawerTitle>Actividade de {helper.name}</DrawerTitle>
        <DrawerDescription>{helper.job_title || "Ajudante"} · Operações sincronizadas com a loja</DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 space-y-3 overflow-y-auto px-5 pb-2">
        <div role="group" aria-label="Período" className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary p-1">
          {([1,7,30] as const).map(d=><Button key={d} type="button" variant={days===d?"hero":"ghost"} aria-pressed={days===d} className="min-h-11" onClick={()=>setDays(d)}>{d===1?"24 horas":d+" dias"}</Button>)}
        </div>
        {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/>A carregar actividades…</p> : error ? <Card className="text-sm">Não foi possível consultar as actividades. Tente novamente.</Card> : data && <>
          <div className="grid grid-cols-2 gap-2">
            <Card><ShoppingBag className="mb-2 size-5 text-primary"/><p className="text-xs text-muted-foreground">Vendas ({data.sales_count})</p><p className="font-bold">{formatKz(data.sales_total)}</p></Card>
            <Card><HandCoins className="mb-2 size-5 text-primary"/><p className="text-xs text-muted-foreground">Recebimentos ({data.payments_count})</p><p className="font-bold">{formatKz(data.payments_total)}</p></Card>
          </div>
          <Card className="flex items-center gap-3"><Package className="size-5 text-primary"/><p className="text-sm">Ajustes de stock</p><strong className="ml-auto">{data.stock_count}</strong></Card>
          <p className="text-sm font-semibold">Actividades recentes (até 100)</p>
          {data.events.length===0?<p className="text-sm text-muted-foreground">Sem actividades neste período.</p>:data.events.map(e=><Card key={e.kind+e.id} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">{e.kind==="sale"?<ShoppingBag className="size-5"/>:e.kind==="payment"?<HandCoins className="size-5"/>:<Package className="size-5"/>}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{e.kind==="sale"?"Venda":e.kind==="payment"?"Pagamento recebido":"Ajuste de stock"}</p><p className="truncate text-xs text-muted-foreground">{e.product?e.product+" · ":""}{new Date(e.at).toLocaleString("pt-AO")}</p></div>
            <strong className="text-sm">{e.amount!==null?formatKz(e.amount):((e.delta??0)>0?"+":"")+(e.delta??0)}</strong>
          </Card>)}
        </>}
      </div>
      <DrawerFooter className="px-5"><Button variant="soft" disabled={loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw/>Actualizar</Button><Button variant="ghost" onClick={onClose}>Fechar</Button></DrawerFooter>
    </DrawerContent>
  </Drawer>;
}
