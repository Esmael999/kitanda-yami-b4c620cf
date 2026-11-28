import {describe,it,expect} from "vitest";
import {periodRange,shiftPeriod,reportSeries,dateKey} from "@/lib/report-period";
import {emptyState,type Sale} from "@/lib/ledger";
const d=(y:number,m:number,day:number)=>new Date(y,m-1,day);
describe("calendar reports",()=>{
 it("uses Monday to Sunday, calendar months and leap years",()=>{
 const week=periodRange("week",d(2026,11,28));expect(dateKey(week.from)).toBe("2026-11-23");expect(dateKey(week.to)).toBe("2026-11-30");
 const month=periodRange("month",d(2024,2,29));expect(dateKey(month.to)).toBe("2024-03-01");
 expect(dateKey(shiftPeriod("month",d(2024,3,31),-1))).toBe("2024-02-01");
 const year=periodRange("year",d(2024,12,31));expect(dateKey(year.from)).toBe("2024-01-01");expect(dateKey(year.to)).toBe("2025-01-01");
 });
 it("includes every month and old sales, excluding the end boundary",()=>{
 const sale=(id:string,at:Date):Sale=>({id,createdAt:at.toISOString(),customerId:null,paid:800,total:800,items:[{productId:"p",name:"P",qty:1,price:800,cost:1000}]});
 const state={...emptyState(),sales:[sale("old",d(2024,1,1)),sale("last",d(2024,12,31)),sale("next",d(2025,1,1))]};
 const series=reportSeries(state,periodRange("year",d(2024,5,1)));
 expect(series.unit).toBe("mês");expect(series.points).toHaveLength(12);expect(series.points.reduce((s,p)=>s+p.total,0)).toBe(1600);expect(series.points.reduce((s,p)=>s+p.profit,0)).toBe(-400);
 const wide=reportSeries(state,{from:d(2023,1,1),to:d(2026,1,1)});expect(wide.points).toHaveLength(36);expect(wide.points.reduce((s,p)=>s+p.total,0)).toBe(2400);
 });
});