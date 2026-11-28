import {describe,it,expect} from "vitest";
import {emptyState,recordSale,saleProfit,periodStats,salesByDay,unitProfit,cartProfit,profitColor,profitLabel,startOfDay,addDays} from "@/lib/ledger";
describe("gross profit and loss",()=>{
 const now=new Date(2026,10,28,12);
 const state={...emptyState(),products:[{id:"p",name:"Arroz",price:800,cost:1000,stock:10,minStock:1},{id:"q",name:"Óleo",price:1500,cost:1000,stock:10,minStock:1}]};
 it("calculates signed unit and basket margins",()=>{
 const product=state.products[0];
 if(!product)throw new Error("Expected the rice product");
 expect(unitProfit(product)).toBe(-200);
 expect(cartProfit([{price:800,cost:1000,qty:3},{price:1500,cost:1000,qty:1}])).toBe(-100);
 expect(profitLabel(0)).toBe("Sem lucro nem prejuízo");
 expect(profitColor(-1)).toBe("text-destructive");
 expect(profitColor(1)).toBe("text-primary");
 });
 it("preserves historical costs and permits loss sales",()=>{
 const sold=recordSale(state,{items:[{productId:"p",qty:3}],mode:"pronto",now});
 const sale=sold.sales[0];
 if(!sale)throw new Error("Expected the recorded sale");
 expect(saleProfit(sale)).toBe(-600);
 const changed={...sold,products:sold.products.map(p=>({...p,cost:1}))};
 const stats=periodStats(changed,startOfDay(now),addDays(startOfDay(now),1));
 expect(stats.profit).toBe(-600);expect(stats.lossTotal).toBe(600);expect(stats.lossCount).toBe(1);
 const day=salesByDay(changed,1,now)[0];
 if(!day)throw new Error("Expected the daily result");
 expect(day.profit).toBe(-600);
 });
 it("does not treat credit sales as losses",()=>{
 const s={...state,customers:[{id:"c",name:"Cliente",phone:"",createdAt:now.toISOString()}]};
 const sold=recordSale(s,{items:[{productId:"q",qty:1}],mode:"fiado",customerId:"c",upfront:0,now});
 const sale=sold.sales[0];
 if(!sale)throw new Error("Expected the credit sale");
 expect(saleProfit(sale)).toBe(500);
 expect(sale.paid).toBe(0);
 });
});