import { Router } from 'express';
import { desc, eq, and, ne, max, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { auditLogs, cafeSettings, cafeTables, invoices, menuItems, orderItems, orders, orderStatusEvents } from '../db/schema.js';
import { requireAuth } from '../auth.js';
export const ordersRouter = Router();
const statusValues=['RECEIVED','ACCEPTED','PREPARING','READY','SERVED','COMPLETED','CANCELLED'] as const;
const inputSchema=z.object({source:z.enum(['DINE_IN','WALK_IN','TAKEAWAY','WEBSITE','SWIGGY','ZOMATO']),tableId:z.number().int().positive().nullable().optional(),tableToken:z.string().optional(),externalPlatformOrderId:z.string().trim().min(1).max(120).optional(),customerName:z.string().trim().max(120).optional(),customerPhone:z.string().trim().max(30).optional(),deliveryAddress:z.string().trim().max(1000).optional(),deliveryInstructions:z.string().trim().max(1000).optional(),paymentMethod:z.enum(['CASH','UPI','CARD','ONLINE','SWIGGY','ZOMATO','OTHER']).default('CASH'),platformSubtotalPaise:z.number().int().min(0).optional(),platformCommissionPaise:z.number().int().min(0).default(0),orderNotes:z.string().max(1000).optional(),paymentStatus:z.enum(['PENDING','PAID','PARTIAL']).default('PENDING'),taxRateBps:z.number().int().min(0).max(10000).default(0),discountPaise:z.number().int().min(0).default(0),discountType:z.enum(['PERCENT','FIXED']).default('FIXED'),discountValue:z.number().int().min(0).default(0),lines:z.array(z.object({menuItemId:z.number().int().positive(),quantity:z.number().int().min(1).max(100),notes:z.string().max(500).optional()})).min(1)});
ordersRouter.get('/',requireAuth('OWNER','MANAGER','CASHIER','KITCHEN','SERVICE'),async(_req,res,next)=>{try{res.json({orders:await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100)});}catch(e){next(e);}});
ordersRouter.get('/website-pending',requireAuth('OWNER','MANAGER','CASHIER'),async(_req,res,next)=>{try{const pending=await db.select().from(orders).where(inArray(orders.source,['WEBSITE','TAKEAWAY'])).orderBy(desc(orders.createdAt)).limit(100);res.json({orders:pending.filter(o=>o.status==='RECEIVED')});}catch(e){next(e);}});
ordersRouter.get('/track/:orderNumber',async(req,res,next)=>{try{const number=String(req.params.orderNumber||'').trim();const [order]=await db.select({orderNumber:orders.orderNumber,status:orders.status,createdAt:orders.createdAt,source:orders.source}).from(orders).where(eq(orders.orderNumber,number)).limit(1);if(!order||!['WEBSITE','TAKEAWAY'].includes(order.source))return res.status(404).json({error:'Order not found'});res.json({order});}catch(e){next(e);}});
ordersRouter.get('/:id',requireAuth('OWNER','MANAGER','CASHIER','KITCHEN','SERVICE'),async(req,res,next)=>{try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid order ID'});const [order]=await db.select().from(orders).where(eq(orders.id,id)).limit(1);if(!order)return res.status(404).json({error:'Order not found'});const [lines,invoice,statusEvents,table]=await Promise.all([db.select().from(orderItems).where(eq(orderItems.orderId,id)),db.select().from(invoices).where(eq(invoices.orderId,id)).limit(1),db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId,id)).orderBy(desc(orderStatusEvents.createdAt)),order.tableId?db.select().from(cafeTables).where(eq(cafeTables.id,order.tableId)).limit(1):Promise.resolve([])]);res.json({order,lines,invoice:invoice[0]??null,statusEvents,table:table[0]??null});}catch(e){next(e);}});
ordersRouter.post('/',async(req,res,next)=>{const source=String(req.body?.source||'');if(source==='WEBSITE'||source==='TAKEAWAY')return next();if(source==='DINE_IN'&&req.body?.tableId&&req.body?.tableToken){try{const [table]=await db.select().from(cafeTables).where(eq(cafeTables.id,Number(req.body.tableId))).limit(1);if(table?.active&&table.qrToken===String(req.body.tableToken))return next();}catch(e){return next(e);}}return requireAuth('OWNER','MANAGER','CASHIER')(req,res,next);},async(req,res,next)=>{try{const parsed=inputSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid order',details:parsed.error.flatten()});const v=parsed.data;if(v.source==='DINE_IN'&&!v.tableId)return res.status(400).json({error:'A table must be selected for dine-in orders'});if((v.source==='SWIGGY'||v.source==='ZOMATO')&&!v.externalPlatformOrderId)return res.status(400).json({error:'Platform order ID is required'});if((v.source==='SWIGGY'||v.source==='ZOMATO')&&v.platformCommissionPaise>0&&v.platformSubtotalPaise===undefined)return res.status(400).json({error:'Enter platform subtotal when recording a platform commission'});if(!['DINE_IN','WALK_IN'].includes(v.source)&&v.tableId)return res.status(400).json({error:'Table number is only valid for dine-in or walk-in table service'});if(v.tableId){const [table]=await db.select().from(cafeTables).where(eq(cafeTables.id,v.tableId)).limit(1);if(!table?.active)return res.status(400).json({error:'Selected table is not active'});}const catalogue=await db.select().from(menuItems).where(eq(menuItems.available,true));const byId=new Map(catalogue.map(x=>[x.id,x]));if(v.lines.some(x=>!byId.has(x.menuItemId)))return res.status(400).json({error:'One or more menu items are unavailable'});const snapshots=v.lines.map(x=>({menuItemId:x.menuItemId,itemNameSnapshot:byId.get(x.menuItemId)!.name,quantity:x.quantity,unitPricePaise:byId.get(x.menuItemId)!.pricePaise,notes:x.notes??null,batchNumber:1,kitchenStatus:'PENDING'}));const subtotal=snapshots.reduce((sum,x)=>sum+x.quantity*x.unitPricePaise,0);if(v.discountType==='FIXED'&&v.discountPaise>subtotal)return res.status(400).json({error:'Discount cannot exceed subtotal'});const discountPaise=v.discountType==='PERCENT'?Math.min(subtotal,Math.round(subtotal*Math.min(v.discountValue,10000)/10000)):v.discountPaise;const tax=Math.round((subtotal-discountPaise)*v.taxRateBps/10000),total=subtotal-discountPaise+tax;const stamp=Date.now();const orderNumber=`SK-${stamp}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;const result=await db.transaction(async tx=>{const [created]=await tx.insert(orders).values({orderNumber,source:v.source,status:'RECEIVED',tableId:v.tableId??null,externalPlatformOrderId:v.externalPlatformOrderId??null,customerName:v.customerName??null,customerPhone:v.customerPhone??null,deliveryAddress:v.deliveryAddress??null,deliveryInstructions:v.deliveryInstructions??null,paymentMethod:v.paymentMethod,platformSubtotalPaise:v.platformSubtotalPaise??null,platformCommissionPaise:v.platformCommissionPaise,orderNotes:v.orderNotes??null,subtotalPaise:subtotal,taxPaise:tax,discountPaise,discountType:v.discountType,discountValue:v.discountValue,createdByUserId:(req as any).user?.id??null,createdByName:(req as any).user?.name??'Customer',createdByRole:(req as any).user?.role??'CUSTOMER',totalPaise:total,paymentStatus:['WEBSITE','TAKEAWAY'].includes(v.source)?'PENDING':v.paymentStatus}).returning();await tx.insert(orderItems).values(snapshots.map(x=>({...x,orderId:created.id})));const invoiceNumber=`INV-${new Date().getFullYear()}-${String(created.id).padStart(6,'0')}`;const [invoice]=await tx.insert(invoices).values({orderId:created.id,invoiceNumber,subtotalPaise:subtotal,taxPaise:tax,discountPaise,totalPaise:total,paymentStatus:['WEBSITE','TAKEAWAY'].includes(v.source)?'PENDING':v.paymentStatus}).returning();await tx.insert(orderStatusEvents).values({orderId:created.id,fromStatus:null,toStatus:'RECEIVED',note:['WEBSITE','TAKEAWAY'].includes(v.source)?`${v.source} order submitted — awaiting staff approval`:'Order created'});await tx.insert(auditLogs).values({actorUserId:(req as any).user?.id??null,action:'ORDER_CREATED',entityType:'ORDER',entityId:String(created.id),details:JSON.stringify({source:v.source,createdByName:(req as any).user?.name??'Customer'})});return {order:created,invoice};});res.status(201).json({...result,orderId:result.order.id,lines:snapshots});}catch(e){next(e);}});
// A table has one running dine-in tab. Add-on orders append to that tab and receive a fresh KOT batch.
ordersRouter.get('/table/:tableId/open',requireAuth('OWNER','MANAGER','CASHIER','SERVICE'),async(req,res,next)=>{try{const tableId=Number(req.params.tableId);if(!Number.isInteger(tableId)||tableId<1)return res.status(400).json({error:'Invalid table'});const [order]=await db.select().from(orders).where(and(eq(orders.tableId,tableId),eq(orders.source,'DINE_IN'),ne(orders.paymentStatus,'PAID'),ne(orders.status,'CANCELLED'),ne(orders.status,'COMPLETED'))).orderBy(desc(orders.createdAt)).limit(1);if(!order)return res.json({order:null});const [lines,invoice]=await Promise.all([db.select().from(orderItems).where(eq(orderItems.orderId,order.id)),db.select().from(invoices).where(eq(invoices.orderId,order.id)).limit(1)]);res.json({order,lines,invoice:invoice[0]??null});}catch(e){next(e);}});

ordersRouter.post('/:id/items',requireAuth('OWNER','MANAGER','CASHIER','SERVICE'),async(req,res,next)=>{try{const id=Number(req.params.id),parsed=z.object({lines:z.array(z.object({menuItemId:z.number().int().positive(),quantity:z.number().int().min(1).max(100),notes:z.string().max(500).optional()})).min(1)}).safeParse(req.body);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid order ID'});if(!parsed.success)return res.status(400).json({error:'Add at least one valid item'});const result=await db.transaction(async tx=>{const [current]=await tx.select().from(orders).where(eq(orders.id,id)).limit(1);if(!current)return null;if(current.source!=='DINE_IN'||!current.tableId||current.paymentStatus==='PAID'||['COMPLETED','CANCELLED'].includes(current.status))throw new Error('Only an open dine-in table can receive additional items');const catalogue=await tx.select().from(menuItems).where(eq(menuItems.available,true));const byId=new Map(catalogue.map(x=>[x.id,x]));if(parsed.data.lines.some(x=>!byId.has(x.menuItemId)))throw new Error('One or more menu items are unavailable');const existing=await tx.select({n:max(orderItems.batchNumber)}).from(orderItems).where(eq(orderItems.orderId,id));const batch=(existing[0]?.n??1)+1;const additions=parsed.data.lines.map(x=>({orderId:id,menuItemId:x.menuItemId,itemNameSnapshot:byId.get(x.menuItemId)!.name,quantity:x.quantity,unitPricePaise:byId.get(x.menuItemId)!.pricePaise,notes:x.notes??null,batchNumber:batch,kitchenStatus:'PENDING'}));await tx.insert(orderItems).values(additions);const addedSubtotal=additions.reduce((n,x)=>n+x.quantity*x.unitPricePaise,0);const subtotal=current.subtotalPaise+addedSubtotal;const discount=current.discountType==='PERCENT'?Math.min(subtotal,Math.round(subtotal*Math.min(current.discountValue,10000)/10000)):Math.min(subtotal,current.discountPaise);const [settings]=await tx.select().from(cafeSettings).limit(1);const taxRate=settings?.taxRateBps??0;const tax=Math.round((subtotal-discount)*taxRate/10000);const total=subtotal-discount+tax;const [updated]=await tx.update(orders).set({subtotalPaise:subtotal,discountPaise:discount,taxPaise:tax,totalPaise:total}).where(eq(orders.id,id)).returning();await tx.update(invoices).set({subtotalPaise:subtotal,discountPaise:discount,taxPaise:tax,totalPaise:total}).where(eq(invoices.orderId,id));await tx.insert(auditLogs).values({actorUserId:(req as any).user?.id??null,action:'DINE_IN_ITEMS_ADDED',entityType:'ORDER',entityId:String(id),details:JSON.stringify({batch,items:additions.map(x=>({name:x.itemNameSnapshot,quantity:x.quantity})),actor:(req as any).user?.name??'Unknown'})});return {order:updated,batch,lines:additions};});if(!result)return res.status(404).json({error:'Order not found'});res.status(201).json(result);}catch(e){if(e instanceof Error&&(/Only an open|unavailable/.test(e.message)))return res.status(409).json({error:e.message});next(e);}});

ordersRouter.patch('/:id/status',requireAuth('OWNER','MANAGER','CASHIER','KITCHEN','SERVICE'),async(req,res,next)=>{try{const id=Number(req.params.id),parsed=z.object({status:z.enum(statusValues),note:z.string().max(500).optional()}).safeParse(req.body);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid order ID'});if(!parsed.success)return res.status(400).json({error:'Invalid status',details:parsed.error.flatten()});const result=await db.transaction(async tx=>{const [current]=await tx.select().from(orders).where(eq(orders.id,id)).limit(1);if(!current)return null;const transitions:Record<string,string[]>={RECEIVED:['ACCEPTED','CANCELLED'],ACCEPTED:['PREPARING','CANCELLED'],PREPARING:['READY','CANCELLED'],READY:['SERVED','CANCELLED'],SERVED:['COMPLETED'],COMPLETED:[],CANCELLED:[]};if(!transitions[current.status]?.includes(parsed.data.status))throw new Error(`Invalid order transition: ${current.status} → ${parsed.data.status}`);const [updated]=await tx.update(orders).set({status:parsed.data.status}).where(eq(orders.id,id)).returning();await tx.insert(orderStatusEvents).values({orderId:id,fromStatus:current.status,toStatus:parsed.data.status,note:parsed.data.note??null});await tx.insert(auditLogs).values({actorUserId:(req as any).user?.id??null,action:'ORDER_STATUS_CHANGED',entityType:'ORDER',entityId:String(id),details:JSON.stringify({from:current.status,to:parsed.data.status,note:parsed.data.note??null,actor:(req as any).user?.name??'Unknown'})});return updated;});if(!result)return res.status(404).json({error:'Order not found'});res.json({order:result});}catch(e){if(e instanceof Error&&(/Invalid order transition/.test(e.message)))return res.status(409).json({error:e.message});next(e);}});
ordersRouter.patch('/:id/payment',requireAuth('OWNER','MANAGER','CASHIER'),async(req,res,next)=>{try{const id=Number(req.params.id),p=z.object({paymentStatus:z.enum(['PENDING','PAID','PARTIAL'])}).safeParse(req.body);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid order ID'});if(!p.success)return res.status(400).json({error:'Invalid payment status'});const updated=await db.transaction(async tx=>{const [o]=await tx.update(orders).set({paymentStatus:p.data.paymentStatus}).where(eq(orders.id,id)).returning();if(o){await tx.update(invoices).set({paymentStatus:p.data.paymentStatus}).where(eq(invoices.orderId,id));await tx.insert(auditLogs).values({actorUserId:(req as any).user?.id??null,action:'ORDER_PAYMENT_UPDATED',entityType:'ORDER',entityId:String(id),details:JSON.stringify({paymentStatus:p.data.paymentStatus,actor:(req as any).user?.name??'Unknown'})});}return o;});if(!updated)return res.status(404).json({error:'Order not found'});res.json({order:updated});}catch(e){next(e);}});
ordersRouter.get('/:id/receipt/:type',requireAuth('OWNER','MANAGER','CASHIER','KITCHEN','SERVICE'),async(req,res,next)=>{try{const id = Number(req.params.id);
const type = Array.isArray(req.params.type)
  ? req.params.type[0]
  : req.params.type;if(!Number.isInteger(id)||id<1||!['kot','invoice'].includes(type))return res.status(400).json({error:'Invalid receipt request'});const [order]=await db.select().from(orders).where(eq(orders.id,id)).limit(1);if(!order)return res.status(404).json({error:'Order not found'});const batch=req.query.batch?Number(req.query.batch):null;const allLines=await db.select().from(orderItems).where(eq(orderItems.orderId,id));const lines=type==='kot'&&batch?allLines.filter(x=>x.batchNumber===batch):allLines;const [invoice,table,cafe]=await Promise.all([db.select().from(invoices).where(eq(invoices.orderId,id)).limit(1),order.tableId?db.select().from(cafeTables).where(eq(cafeTables.id,order.tableId)).limit(1):Promise.resolve([]),db.select().from(cafeSettings).limit(1)]);res.json({type,order,lines,invoice:invoice[0]??null,table:table[0]??null,cafe:cafe[0]??null});}catch(e){next(e);}});


// Cashier edits are allowed only before a KOT has been sent to the kitchen.
ordersRouter.patch('/:id/edit',requireAuth('OWNER','MANAGER','CASHIER'),async(req,res,next)=>{
  try {
    const id=Number(req.params.id);
    const parsed=z.object({
      lines:z.array(z.object({menuItemId:z.number().int().positive(),quantity:z.number().int().min(1).max(100),notes:z.string().max(500).optional()})).min(1),
      discountType:z.enum(['FIXED','PERCENT']).optional(),
      discountPaise:z.number().int().min(0).optional(),
      discountValue:z.number().int().min(0).max(1000000).optional(),
      taxRateBps:z.number().int().min(0).max(10000).optional(),
      customerName:z.string().trim().max(120).optional(),
      customerPhone:z.string().trim().max(30).optional(),
      deliveryAddress:z.string().trim().max(1000).optional(),
      orderNotes:z.string().max(1000).optional(),
      paymentMethod:z.enum(['CASH','UPI','CARD','ONLINE','SWIGGY','ZOMATO','OTHER']).optional(),
      paymentStatus:z.enum(['PENDING','PAID','PARTIAL']).optional()
    }).safeParse(req.body);
    if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid order ID'});
    if(!parsed.success)return res.status(400).json({error:'Invalid order edit',details:parsed.error.flatten()});
    const result=await db.transaction(async tx=>{
      const [current]=await tx.select().from(orders).where(eq(orders.id,id)).limit(1);
      if(!current)return null;
      if(!['RECEIVED','ACCEPTED'].includes(current.status))throw new Error('This order is locked because its KOT has already been sent to the kitchen.');
      const v=parsed.data;
      const ids=[...new Set(v.lines.map(x=>x.menuItemId))];
      const catalogue=await tx.select().from(menuItems).where(inArray(menuItems.id,ids));
      const byId=new Map(catalogue.map(x=>[x.id,x]));
      if(ids.length!==catalogue.length||v.lines.some(x=>!byId.get(x.menuItemId)?.available))throw new Error('One or more selected menu items are unavailable.');
      const nextLines=v.lines.map(x=>({orderId:id,menuItemId:x.menuItemId,itemNameSnapshot:byId.get(x.menuItemId)!.name,quantity:x.quantity,unitPricePaise:byId.get(x.menuItemId)!.pricePaise,notes:x.notes??null,batchNumber:1,kitchenStatus:'PENDING'}));
      const subtotal=nextLines.reduce((sum,x)=>sum+x.quantity*x.unitPricePaise,0);
      const discountType=v.discountType??current.discountType??'FIXED';
      const discountValue=v.discountValue??current.discountValue??0;
      const discountPaise=discountType==='PERCENT'?Math.min(subtotal,Math.round(subtotal*Math.min(discountValue,10000)/10000)):Math.min(subtotal,v.discountPaise??current.discountPaise??0);
      const [settings]=await tx.select().from(cafeSettings).limit(1);
      const taxRateBps=v.taxRateBps??settings?.taxRateBps??0;
      const taxPaise=Math.round((subtotal-discountPaise)*taxRateBps/10000);
      const totalPaise=subtotal-discountPaise+taxPaise;
      await tx.delete(orderItems).where(eq(orderItems.orderId,id));
      await tx.insert(orderItems).values(nextLines);
      const [updated]=await tx.update(orders).set({
        subtotalPaise,discountPaise,taxPaise,totalPaise,discountType,discountValue,
        customerName:v.customerName?.trim()||null,customerPhone:v.customerPhone?.trim()||null,
        deliveryAddress:v.deliveryAddress?.trim()||null,orderNotes:v.orderNotes?.trim()||null,
        paymentMethod:v.paymentMethod??current.paymentMethod,paymentStatus:v.paymentStatus??current.paymentStatus
      }).where(eq(orders.id,id)).returning();
      await tx.update(invoices).set({subtotalPaise,discountPaise,taxPaise,totalPaise,paymentStatus:v.paymentStatus??current.paymentStatus}).where(eq(invoices.orderId,id));
      await tx.insert(auditLogs).values({actorUserId:(req as any).user?.id??null,action:'ORDER_BILL_EDITED',entityType:'ORDER',entityId:String(id),details:JSON.stringify({itemCount:nextLines.length,totalPaise,actor:(req as any).user?.name??'Unknown'})});
      return {order:updated,lines:nextLines};
    });
    if(!result)return res.status(404).json({error:'Order not found'});
    res.json(result);
  } catch(e) {
    if(e instanceof Error&&/locked|unavailable/.test(e.message))return res.status(409).json({error:e.message});
    next(e);
  }
});


// Explicit print events drive the cafe workflow. Repeated clicks are idempotent.
ordersRouter.post('/:id/print-event',requireAuth('OWNER','MANAGER','CASHIER','KITCHEN','SERVICE'),async(req,res,next)=>{
  try {
    const id=Number(req.params.id);
    const parsed=z.object({type:z.enum(['kot','invoice'])}).safeParse(req.body);
    if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid order ID'});
    if(!parsed.success)return res.status(400).json({error:'Print type must be kot or invoice'});
    const result=await db.transaction(async tx=>{
      const [current]=await tx.select().from(orders).where(eq(orders.id,id)).limit(1);
      if(!current)return null;
      if(current.status==='CANCELLED')throw new Error('A cancelled order cannot be printed or completed.');
      let updated=current;
      let changed=false;
      if(parsed.data.type==='kot') {
        if(current.status==='RECEIVED') {
          await tx.insert(orderStatusEvents).values({orderId:id,fromStatus:'RECEIVED',toStatus:'ACCEPTED',note:'KOT print requested by cashier'});
          await tx.insert(orderStatusEvents).values({orderId:id,fromStatus:'ACCEPTED',toStatus:'PREPARING',note:'KOT sent to kitchen — making started'});
          [updated]=await tx.update(orders).set({status:'PREPARING'}).where(eq(orders.id,id)).returning();
          changed=true;
        } else if(current.status==='ACCEPTED') {
          await tx.insert(orderStatusEvents).values({orderId:id,fromStatus:'ACCEPTED',toStatus:'PREPARING',note:'KOT sent to kitchen — making started'});
          [updated]=await tx.update(orders).set({status:'PREPARING'}).where(eq(orders.id,id)).returning();
          changed=true;
        }
      } else if(current.status!=='COMPLETED') {
        await tx.insert(orderStatusEvents).values({orderId:id,fromStatus:current.status,toStatus:'COMPLETED',note:'Customer invoice printed — order closed by cashier'});
        [updated]=await tx.update(orders).set({status:'COMPLETED'}).where(eq(orders.id,id)).returning();
        changed=true;
      }
      await tx.insert(auditLogs).values({actorUserId:(req as any).user?.id??null,action:parsed.data.type==='kot'?'KOT_PRINT_REQUESTED':'INVOICE_PRINTED_ORDER_COMPLETED',entityType:'ORDER',entityId:String(id),details:JSON.stringify({type:parsed.data.type,status:updated.status,changed,actor:(req as any).user?.name??'Unknown'})});
      return {order:updated,changed,printType:parsed.data.type};
    });
    if(!result)return res.status(404).json({error:'Order not found'});
    res.json(result);
  } catch(e) {
    if(e instanceof Error&&/cancelled/.test(e.message))return res.status(409).json({error:e.message});
    next(e);
  }
});
