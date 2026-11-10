const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve(process.cwd(), 'apps/api/src/routes/orders.ts');
if (!fs.existsSync(file)) {
  console.error('Could not find apps/api/src/routes/orders.ts. Run this script from the Sukoon Cafe project root.');
  process.exit(1);
}

let source = fs.readFileSync(file, 'utf8');
let changed = false;

// Discount percentage values are stored as basis points (10% = 1000).
// The previous cap of 100 accidentally limited discounts to 1%.
const discountFixes = [
  ['Math.min(v.discountValue,100)', 'Math.min(v.discountValue,10000)'],
  ['Math.min(current.discountValue,100)', 'Math.min(current.discountValue,10000)'],
];
for (const [before, after] of discountFixes) {
  if (source.includes(before)) {
    source = source.replaceAll(before, after);
    changed = true;
  }
}

const editRouteMarker = "ordersRouter.patch('/:id/edit'";
if (!source.includes(editRouteMarker)) {
  source += `\n\n// Cashier edits are allowed only before a KOT has been sent to the kitchen.\nordersRouter.patch('/:id/edit',requireAuth('OWNER','MANAGER','CASHIER'),async(req,res,next)=>{\n  try {\n    const id=Number(req.params.id);\n    const parsed=z.object({\n      lines:z.array(z.object({menuItemId:z.number().int().positive(),quantity:z.number().int().min(1).max(100),notes:z.string().max(500).optional()})).min(1),\n      discountType:z.enum(['FIXED','PERCENT']).optional(),\n      discountPaise:z.number().int().min(0).optional(),\n      discountValue:z.number().int().min(0).max(1000000).optional(),\n      taxRateBps:z.number().int().min(0).max(10000).optional(),\n      customerName:z.string().trim().max(120).optional(),\n      customerPhone:z.string().trim().max(30).optional(),\n      deliveryAddress:z.string().trim().max(1000).optional(),\n      orderNotes:z.string().max(1000).optional(),\n      paymentMethod:z.enum(['CASH','UPI','CARD','ONLINE','SWIGGY','ZOMATO','OTHER']).optional(),\n      paymentStatus:z.enum(['PENDING','PAID','PARTIAL']).optional()\n    }).safeParse(req.body);\n    if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid order ID'});\n    if(!parsed.success)return res.status(400).json({error:'Invalid order edit',details:parsed.error.flatten()});\n    const result=await db.transaction(async tx=>{\n      const [current]=await tx.select().from(orders).where(eq(orders.id,id)).limit(1);\n      if(!current)return null;\n      if(!['RECEIVED','ACCEPTED'].includes(current.status))throw new Error('This order is locked because its KOT has already been sent to the kitchen.');\n      const v=parsed.data;\n      const ids=[...new Set(v.lines.map(x=>x.menuItemId))];\n      const catalogue=await tx.select().from(menuItems).where(inArray(menuItems.id,ids));\n      const byId=new Map(catalogue.map(x=>[x.id,x]));\n      if(ids.length!==catalogue.length||v.lines.some(x=>!byId.get(x.menuItemId)?.available))throw new Error('One or more selected menu items are unavailable.');\n      const nextLines=v.lines.map(x=>({orderId:id,menuItemId:x.menuItemId,itemNameSnapshot:byId.get(x.menuItemId)!.name,quantity:x.quantity,unitPricePaise:byId.get(x.menuItemId)!.pricePaise,notes:x.notes??null,batchNumber:1,kitchenStatus:'PENDING'}));\n      const subtotal=nextLines.reduce((sum,x)=>sum+x.quantity*x.unitPricePaise,0);\n      const discountType=v.discountType??current.discountType??'FIXED';\n      const discountValue=v.discountValue??current.discountValue??0;\n      const discountPaise=discountType==='PERCENT'?Math.min(subtotal,Math.round(subtotal*Math.min(discountValue,10000)/10000)):Math.min(subtotal,v.discountPaise??current.discountPaise??0);\n      const [settings]=await tx.select().from(cafeSettings).limit(1);\n      const taxRateBps=v.taxRateBps??settings?.taxRateBps??0;\n      const taxPaise=Math.round((subtotal-discountPaise)*taxRateBps/10000);\n      const totalPaise=subtotal-discountPaise+taxPaise;\n      await tx.delete(orderItems).where(eq(orderItems.orderId,id));\n      await tx.insert(orderItems).values(nextLines);\n      const [updated]=await tx.update(orders).set({\n        subtotalPaise,discountPaise,taxPaise,totalPaise,discountType,discountValue,\n        customerName:v.customerName?.trim()||null,customerPhone:v.customerPhone?.trim()||null,\n        deliveryAddress:v.deliveryAddress?.trim()||null,orderNotes:v.orderNotes?.trim()||null,\n        paymentMethod:v.paymentMethod??current.paymentMethod,paymentStatus:v.paymentStatus??current.paymentStatus\n      }).where(eq(orders.id,id)).returning();\n      await tx.update(invoices).set({subtotalPaise,discountPaise,taxPaise,totalPaise,paymentStatus:v.paymentStatus??current.paymentStatus}).where(eq(invoices.orderId,id));\n      await tx.insert(auditLogs).values({actorUserId:(req as any).user?.id??null,action:'ORDER_BILL_EDITED',entityType:'ORDER',entityId:String(id),details:JSON.stringify({itemCount:nextLines.length,totalPaise,actor:(req as any).user?.name??'Unknown'})});\n      return {order:updated,lines:nextLines};\n    });\n    if(!result)return res.status(404).json({error:'Order not found'});\n    res.json(result);\n  } catch(e) {\n    if(e instanceof Error&&/locked|unavailable/.test(e.message))return res.status(409).json({error:e.message});\n    next(e);\n  }\n});\n`;
  changed = true;
}

const printRouteMarker = "ordersRouter.post('/:id/print-event'";
if (!source.includes(printRouteMarker)) {
  source += `\n\n// Explicit print events drive the cafe workflow. Repeated clicks are idempotent.\nordersRouter.post('/:id/print-event',requireAuth('OWNER','MANAGER','CASHIER','KITCHEN','SERVICE'),async(req,res,next)=>{\n  try {\n    const id=Number(req.params.id);\n    const parsed=z.object({type:z.enum(['kot','invoice'])}).safeParse(req.body);\n    if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid order ID'});\n    if(!parsed.success)return res.status(400).json({error:'Print type must be kot or invoice'});\n    const result=await db.transaction(async tx=>{\n      const [current]=await tx.select().from(orders).where(eq(orders.id,id)).limit(1);\n      if(!current)return null;\n      if(current.status==='CANCELLED')throw new Error('A cancelled order cannot be printed or completed.');\n      let updated=current;\n      let changed=false;\n      if(parsed.data.type==='kot') {\n        if(current.status==='RECEIVED') {\n          await tx.insert(orderStatusEvents).values({orderId:id,fromStatus:'RECEIVED',toStatus:'ACCEPTED',note:'KOT print requested by cashier'});\n          await tx.insert(orderStatusEvents).values({orderId:id,fromStatus:'ACCEPTED',toStatus:'PREPARING',note:'KOT sent to kitchen — making started'});\n          [updated]=await tx.update(orders).set({status:'PREPARING'}).where(eq(orders.id,id)).returning();\n          changed=true;\n        } else if(current.status==='ACCEPTED') {\n          await tx.insert(orderStatusEvents).values({orderId:id,fromStatus:'ACCEPTED',toStatus:'PREPARING',note:'KOT sent to kitchen — making started'});\n          [updated]=await tx.update(orders).set({status:'PREPARING'}).where(eq(orders.id,id)).returning();\n          changed=true;\n        }\n      } else if(current.status!=='COMPLETED') {\n        await tx.insert(orderStatusEvents).values({orderId:id,fromStatus:current.status,toStatus:'COMPLETED',note:'Customer invoice printed — order closed by cashier'});\n        [updated]=await tx.update(orders).set({status:'COMPLETED'}).where(eq(orders.id,id)).returning();\n        changed=true;\n      }\n      await tx.insert(auditLogs).values({actorUserId:(req as any).user?.id??null,action:parsed.data.type==='kot'?'KOT_PRINT_REQUESTED':'INVOICE_PRINTED_ORDER_COMPLETED',entityType:'ORDER',entityId:String(id),details:JSON.stringify({type:parsed.data.type,status:updated.status,changed,actor:(req as any).user?.name??'Unknown'})});\n      return {order:updated,changed,printType:parsed.data.type};\n    });\n    if(!result)return res.status(404).json({error:'Order not found'});\n    res.json(result);\n  } catch(e) {\n    if(e instanceof Error&&/cancelled/.test(e.message))return res.status(409).json({error:e.message});\n    next(e);\n  }\n});\n`;
  changed = true;
}

if (!changed) {
  console.log('No changes needed: the POS edit and print-event routes are already present.');
} else {
  fs.writeFileSync(file, source, 'utf8');
  console.log('Updated apps/api/src/routes/orders.ts');
  console.log('Added pre-KOT bill editing and idempotent print lifecycle events.');
  console.log('Corrected percentage discount calculation to use basis points (10000 = 100%).');
}
