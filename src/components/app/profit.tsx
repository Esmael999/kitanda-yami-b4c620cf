import { AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { formatKz, profitColor, profitLabel } from "@/lib/ledger";
import { cn } from "@/lib/utils";
export function ProfitValue({value,unit=false,className}:{value:number;unit?:boolean;className?:string}) {
  return <span className={cn("font-semibold tabular",profitColor(value),className)}>{profitLabel(value)}{unit?" por unidade":""}: {formatKz(value)}</span>;
}
export function ProfitNotice({value,unit=false}:{value:number;unit?:boolean}) {
  const Icon=value<0?TrendingDown:value>0?TrendingUp:Minus;
  return <div role="status" className={cn("flex items-start gap-2 rounded-2xl border p-3 text-sm",value<0?"border-destructive/40 bg-destructive/10":value>0?"border-primary/30 bg-success-soft":"bg-secondary")}>
    <Icon className={cn("mt-0.5 size-5 shrink-0",profitColor(value))}/>
    <div><ProfitValue value={value} unit={unit}/>{value<0&&<p className="mt-1 text-destructive">{unit?"O preço de venda é inferior ao custo.":"O valor da venda é inferior ao custo dos produtos."}</p>}</div>
  </div>;
}
export function LossNotice({children}:{children:React.ReactNode}) {
  return <div role="status" className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-5 shrink-0"/><div>{children}</div></div>;
}
