import http from "node:http";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {writeFile,unlink} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const exec=promisify(execFile), HOST="127.0.0.1", PORT=8787;
const cors={"Access-Control-Allow-Origin":"http://localhost:3000","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
function send(res,status,data){res.writeHead(status,{"Content-Type":"application/json",...cors});res.end(JSON.stringify(data))}
async function ps(command){const {stdout}=await exec("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",command],{windowsHide:true,maxBuffer:1024*1024});return stdout.trim()}
async function printers(){const raw=await ps("Get-Printer | Select-Object Name,PrinterStatus,DriverName,PortName,Default | ConvertTo-Json -Compress");if(!raw)return[];const v=JSON.parse(raw);return(Array.isArray(v)?v:[v]).map(p=>({name:p.Name,status:p.PrinterStatus,driver:p.DriverName,port:p.PortName,isDefault:!!p.Default}))}
function esc(s){return String(s??"").replace(/[^\x09\x0A\x0D\x20-\x7E]/g,"?")}
function format(job){
 const o=job.order||{},lines=job.lines||[],c=job.cafe||{},w=job.paperWidthMm||80;
 const width=w<=58?32:48,rule="-".repeat(width),center=s=>{s=esc(s);return s.length>=width?s.slice(0,width):" ".repeat(Math.floor((width-s.length)/2))+s};
 const money=n=>"Rs "+(Number(n||0)/100).toFixed(2);
 const wrap=s=>{let a=esc(s),out=[];while(a.length>width){out.push(a.slice(0,width));a=a.slice(width)}out.push(a);return out};
 let out=[center(c.cafeName||"SUKOON CAFE"),center(c.tagline||"A little pause. A little sukoon."),...wrap(c.address||""),...wrap("Phone: "+(c.phone||"")),center(job.type==="kot"?"KITCHEN ORDER":"CUSTOMER BILL"),rule,"Order: "+(o.orderNumber||job.orderId), "Date: "+new Date(o.createdAt||Date.now()).toLocaleString("en-IN"),"Type: "+(o.source||""),...(job.table?["Table: "+job.table.tableNumber]:[]),...(o.customerName?["Customer: "+o.customerName]:[]),...(o.customerPhone?["Phone: "+o.customerPhone]:[]),rule];
 for(const l of lines){out.push(...wrap(`${l.quantity} x ${l.itemNameSnapshot||l.name}`));if(l.notes)out.push(...wrap("  "+l.notes));if(job.type!=="kot")out.push(money((l.unitPricePaise||0)*l.quantity))}
 if(job.type!=="kot"){out.push(rule,"Subtotal: "+money(o.subtotalPaise),"Discount: -"+money(o.discountPaise),"Tax: "+money(o.taxPaise),"TOTAL: "+money(o.totalPaise),"Payment: "+(o.paymentStatus||"")+"/"+(o.paymentMethod||""),"Bill by: "+(o.createdByName||"Staff"),"Thank you! Visit again.");}
 else out.push(rule,"NOTES: "+(o.orderNotes||"—"),"Please prepare this order.");
 out.push(rule,"Printed: "+new Date().toLocaleString("en-IN"),"\n\n\n");return out.join("\r\n");
}
async function printText(name,text){
 const file=path.join(os.tmpdir(),`sukoon-print-${Date.now()}.txt`);
 await writeFile(file,"\u001b@"+text,"utf8");
 try{
  const escaped=file.replace(/'/g,"''"),printer=String(name).replace(/'/g,"''");
  await ps(`Get-Content -LiteralPath '${escaped}' -Raw | Out-Printer -Name '${printer}'`);
 }finally{await unlink(file).catch(()=>{})}
}
const server=http.createServer(async(req,res)=>{
 if(req.method==="OPTIONS"){res.writeHead(204,cors);return res.end()}
 try{
  if(req.method==="GET"&&req.url==="/health")return send(res,200,{ok:true,service:"Sukoon Windows Print Agent",host:HOST,port:PORT});
  if(req.method==="GET"&&req.url==="/printers")return send(res,200,{printers:await printers()});
  if(req.method==="POST"&&(req.url==="/print"||req.url==="/print/test")){
   let body="";for await(const chunk of req)body+=chunk;if(body.length>1024*1024)return send(res,413,{error:"Print job too large"});
   const job=JSON.parse(body||"{}"),list=await printers();
   const wanted=job.printerName||list.find(p=>p.isDefault)?.name||list[0]?.name;
   if(!wanted)return send(res,409,{error:"Windows has no installed printer. Pair/install the printer in Windows first."});
   if(!list.some(p=>p.name===wanted))return send(res,404,{error:"Selected Windows printer is not installed."});
   const text=req.url==="/print/test"?"\r\n       SUKOON CAFE\r\n        TEST PRINT\r\n\r\nPrinter: "+wanted+"\r\nPaper width: "+(job.paperWidthMm||80)+"mm\r\n\r\nA little pause. A little sukoon.\r\n\r\n\r\n":format(job);
   await printText(wanted,text);return send(res,200,{ok:true,queued:true,printerName:wanted,message:"Sent to Windows print spooler"});
  }
  send(res,404,{error:"Not found"});
 }catch(e){send(res,500,{error:e.message||"Print agent error"})}
});
server.listen(PORT,HOST,()=>console.log(`Sukoon Print Agent listening on http://${HOST}:${PORT}`));
