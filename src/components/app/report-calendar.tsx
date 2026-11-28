import {useState} from "react";
import {CalendarDays,ChevronLeft,ChevronRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Calendar} from "@/components/ui/calendar";
import {Card} from "@/components/app/ui";
import {cn} from "@/lib/utils";
import {pt} from "date-fns/locale";
import {addDays,startOfDay} from "@/lib/ledger";
import {dateKey,parseDateKey,periodRange,shiftPeriod,rangeLabel,type ReportPeriod,type ReportRange} from "@/lib/report-period";
const options=[["day","Dia"],["week","Semana"],["month","Mês"],["year","Ano"],["custom","Intervalo"]] as const;
export function ReportCalendar({period,anchor,custom,onPeriod,onAnchor,onCustom}:{period:ReportPeriod;anchor:Date;custom:ReportRange;onPeriod:(p:ReportPeriod)=>void;onAnchor:(d:Date)=>void;onCustom:(r:ReportRange)=>void}){
  const [open,setOpen]=useState(false);
  const today=startOfDay(new Date());
  const range=periodRange(period,anchor,custom);
  const year=anchor.getFullYear(),month=anchor.getMonth();
  const decade=Math.floor(year/10)*10;
  const canNext=shiftPeriod(period,anchor,1)<=today;
  return <Card className="space-y-3">
    <p className="font-semibold">Período do relatório</p>
    <div role="group" aria-label="Tipo de período" className="grid grid-cols-5 gap-1 rounded-2xl bg-secondary p-1">{options.map(([key,label])=><button key={key} type="button" aria-pressed={period===key} onClick={()=>{onPeriod(key);setOpen(key!=="custom");}} className={cn("min-h-11 rounded-xl px-1 text-xs font-semibold",period===key?"bg-primary text-primary-foreground":"text-muted-foreground")}>{label}</button>)}</div>
    {period==="custom"?<div className="grid grid-cols-2 gap-2">
      <label className="text-xs text-muted-foreground">De<input type="date" value={dateKey(custom.from)} max={dateKey(addDays(custom.to,-1))} onChange={e=>{if(e.target.value&&e.target.value<=dateKey(addDays(custom.to,-1)))onCustom({...custom,from:parseDateKey(e.target.value)});}} className="mt-1 h-12 w-full min-w-0 rounded-xl border bg-card px-2 text-sm text-foreground"/></label>
      <label className="text-xs text-muted-foreground">Até<input type="date" value={dateKey(addDays(custom.to,-1))} min={dateKey(custom.from)} max={dateKey(today)} onChange={e=>{if(e.target.value&&e.target.value>=dateKey(custom.from)&&e.target.value<=dateKey(today))onCustom({...custom,to:addDays(parseDateKey(e.target.value),1)});}} className="mt-1 h-12 w-full min-w-0 rounded-xl border bg-card px-2 text-sm text-foreground"/></label>
    </div>:<>
      <div className="flex items-center gap-2">
        <Button variant="soft" size="icon-lg" aria-label="Período anterior" disabled={year<=1900&&month===0} onClick={()=>onAnchor(shiftPeriod(period,anchor,-1))}><ChevronLeft/></Button>
        <Button variant="outline" className="min-h-12 min-w-0 flex-1 whitespace-normal rounded-xl px-2" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><CalendarDays/><span>{rangeLabel(range)}</span></Button>
        <Button variant="soft" size="icon-lg" aria-label="Período seguinte" disabled={!canNext} onClick={()=>onAnchor(shiftPeriod(period,anchor,1))}><ChevronRight/></Button>
      </div>
      {open&&<div className="rounded-2xl border p-2">
        {(period==="day"||period==="week")&&<Calendar className="mx-auto max-w-full bg-card" locale={pt} weekStartsOn={1} mode="single" selected={anchor} month={anchor} onMonthChange={d=>onAnchor(d>today?today:d)} startMonth={new Date(1900,0,1)} endMonth={today} captionLayout="dropdown" disabled={{after:today}} onSelect={d=>{if(d){onAnchor(d);setOpen(false);}}}/>}
        {period==="month"&&<>
          <div className="mb-2 flex items-center justify-between"><Button variant="soft" size="icon-lg" aria-label="Ano anterior" disabled={year<=1900} onClick={()=>onAnchor(new Date(year-1,month,1))}><ChevronLeft/></Button><strong>{year}</strong><Button variant="soft" size="icon-lg" aria-label="Ano seguinte" disabled={year>=today.getFullYear()} onClick={()=>onAnchor(new Date(year+1,Math.min(month,today.getMonth()),1))}><ChevronRight/></Button></div>
          <div className="grid grid-cols-3 gap-2">{Array.from({length:12},(_,m)=><Button key={m} variant={m===month?"hero":"soft"} disabled={new Date(year,m,1)>today} className="h-11 capitalize" onClick={()=>{onAnchor(new Date(year,m,1));setOpen(false);}}>{new Date(year,m,1).toLocaleDateString("pt-AO",{month:"short"})}</Button>)}</div>
        </>}
        {period==="year"&&<>
          <div className="mb-2 flex items-center justify-between"><Button variant="soft" size="icon-lg" aria-label="Década anterior" disabled={decade<=1900} onClick={()=>onAnchor(new Date(decade-10,0,1))}><ChevronLeft/></Button><strong>{decade}–{decade+9}</strong><Button variant="soft" size="icon-lg" aria-label="Década seguinte" disabled={decade+10>today.getFullYear()} onClick={()=>onAnchor(new Date(decade+10,0,1))}><ChevronRight/></Button></div>
          <div className="grid grid-cols-3 gap-2">{Array.from({length:10},(_,i)=>decade+i).map(y=><Button key={y} variant={y===year?"hero":"soft"} disabled={y>today.getFullYear()} className="h-11" onClick={()=>{onAnchor(new Date(y,0,1));setOpen(false);}}>{y}</Button>)}</div>
        </>}
      </div>}
      <Button variant="ghost" className="w-full text-primary" onClick={()=>{onAnchor(today);setOpen(false);}}>Voltar ao período actual</Button>
    </>}
    <p className="text-xs text-muted-foreground">{period==="week"?"Semana de segunda a domingo.":"Os relatórios incluem as operações registadas nas datas seleccionadas."}</p>
  </Card>;
}
