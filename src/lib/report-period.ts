import {addDays,startOfDay,saleProfit,type LedgerState} from "./ledger";
export type ReportPeriod="day"|"week"|"month"|"year"|"custom";
export type ReportRange={from:Date;to:Date};
export const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export function parseDateKey(value:string):Date {
  const [y,m,d]=value.split("-").map(Number);
  if(y===undefined||m===undefined||d===undefined)return new Date(NaN);
  return new Date(y,m-1,d);
}
export function periodRange(period:ReportPeriod,anchor:Date,custom?:ReportRange):ReportRange {
  const day=startOfDay(anchor),y=day.getFullYear(),m=day.getMonth();
  if(period==="custom"&&custom)return custom;
  if(period==="week"){const from=addDays(day,-((day.getDay()+6)%7));return {from,to:addDays(from,7)};}
  if(period==="month")return {from:new Date(y,m,1),to:new Date(y,m+1,1)};
  if(period==="year")return {from:new Date(y,0,1),to:new Date(y+1,0,1)};
  return {from:day,to:addDays(day,1)};
}
export function shiftPeriod(period:ReportPeriod,anchor:Date,step:number):Date {
  const {from}=periodRange(period,anchor);
  if(period==="month")return new Date(from.getFullYear(),from.getMonth()+step,1);
  if(period==="year")return new Date(from.getFullYear()+step,0,1);
  return addDays(from,step*(period==="week"?7:1));
}
export function rangeLabel({from,to}:ReportRange):string {
  const fmt=(d:Date)=>d.toLocaleDateString("pt-AO",{day:"2-digit",month:"short",year:"numeric"});
  const end=addDays(to,-1);
  return dateKey(from)===dateKey(end)?fmt(from):fmt(from)+" – "+fmt(end);
}
export function reportSeries(state:LedgerState,{from,to}:ReportRange){
  const days=Math.round((to.getTime()-from.getTime())/86400000);
  const unit=days<=31?"dia":days<=366?"mês":days<=3660?"mês":"ano";
  const buckets=new Map<string,{date:Date;label:string;total:number;profit:number}>();
  const bucketDate=(d:Date)=>unit==="dia"?startOfDay(d):unit==="mês"?new Date(d.getFullYear(),d.getMonth(),1):new Date(d.getFullYear(),0,1);
  const label=(d:Date)=>unit==="dia"?d.toLocaleDateString("pt-AO",{day:"2-digit",month:"2-digit"}):unit==="mês"?d.toLocaleDateString("pt-AO",{month:"short",year:"2-digit"}):String(d.getFullYear());
  for(let d=bucketDate(from);d<to;d=unit==="dia"?addDays(d,1):unit==="mês"?new Date(d.getFullYear(),d.getMonth()+1,1):new Date(d.getFullYear()+1,0,1)){
    buckets.set(dateKey(d),{date:d,label:label(d),total:0,profit:0});
  }
  for(const sale of state.sales){
    const date=new Date(sale.createdAt);
    if(date<from||date>=to||!Number.isFinite(date.getTime()))continue;
    const b=buckets.get(dateKey(bucketDate(date)));
    if(b){b.total+=sale.total;b.profit+=saleProfit(sale);}
  }
  return {unit,points:[...buckets.values()]};
}
