const fs = require('node:fs');
const path = require('node:path');

const file = path.join('apps', 'api', 'src', 'routes', 'orders.ts');
const marker = '// Explicit print events drive the cafe workflow. Repeated clicks are idempotent.';

if (!fs.existsSync(file)) {
  console.error(`Cannot find ${file}. Run this script from the Sukoon Cafe project root.`);
  process.exit(1);
}

let source = fs.readFileSync(file, 'utf8');
if (source.includes("ordersRouter.post('/:id/pickup'")) {
  console.log('Pickup/payment endpoint already exists. No API changes made.');
  process.exit(0);
}
if (!source.includes(marker)) {
  console.error('Could not find the expected print-event route marker. No changes made.');
  process.exit(1);
}

const route = String.raw`
// Confirm physical handover and record the payment in one database transaction.
// READY -> SERVED is recorded once; later payment collection can be recorded while SERVED.
ordersRouter.post('/:id/pickup',requireAuth('OWNER','MANAGER','CASHIER','SERVICE'),async(req,res,next)=>{
  try {
    const id=Number(req.params.id);
    const parsed=z.object({
      paymentStatus:z.enum(['PAID','PENDING']).default('PAID'),
      paymentMethod:z.enum(['CASH','UPI','CARD','ONLINE','OTHER']).optional()
    }).safeParse(req.body);

    if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid order ID'});
    if(!parsed.success)return res.status(400).json({error:'Invalid pickup/payment details',details:parsed.error.flatten()});
    if(parsed.data.paymentStatus==='PAID'&&!parsed.data.paymentMethod)return res.status(400).json({error:'Select the payment method actually received.'});

    const result=await db.transaction(async tx=>{
      const [current]=await tx.select().from(orders).where(eq(orders.id,id)).limit(1);
      if(!current)return null;
      if(!['READY','SERVED'].includes(current.status))throw new Error('Order must be READY before it can be picked up.');
      if(current.paymentStatus==='PAID'&&parsed.data.paymentStatus!=='PAID')throw new Error('A paid order cannot be changed back to pending.');

      const nextMethod=parsed.data.paymentMethod??current.paymentMethod;
      const changed=current.status!=='SERVED'||current.paymentStatus!==parsed.data.paymentStatus||current.paymentMethod!==nextMethod;
      let updated=current;

      if(changed){
        const patch={
          status:'SERVED' as const,
          paymentStatus:parsed.data.paymentStatus,
          paymentMethod:nextMethod
        };
        [updated]=await tx.update(orders).set(patch).where(eq(orders.id,id)).returning();

        if(current.status==='READY'){
          await tx.insert(orderStatusEvents).values({
            orderId:id,
            fromStatus:'READY',
            toStatus:'SERVED',
            note:'Customer picked up / order handed over'
          });
        }

        await tx.update(invoices).set({paymentStatus:parsed.data.paymentStatus}).where(eq(invoices.orderId,id));
        await tx.insert(auditLogs).values({
          actorUserId:(req as any).user?.id??null,
          action:parsed.data.paymentStatus==='PAID'?'ORDER_PICKED_UP_PAYMENT_COLLECTED':'ORDER_PICKED_UP_PAYMENT_PENDING',
          entityType:'ORDER',
          entityId:String(id),
          details:JSON.stringify({
            fromStatus:current.status,
            toStatus:'SERVED',
            paymentStatus:parsed.data.paymentStatus,
            paymentMethod:nextMethod,
            actor:(req as any).user?.name??'Unknown'
          })
        });
      }

      return {order:updated,changed};
    });

    if(!result)return res.status(404).json({error:'Order not found'});
    res.json(result);
  }catch(e){
    if(e instanceof Error&&/must be READY|paid order cannot/.test(e.message))return res.status(409).json({error:e.message});
    next(e);
  }
});

`;

source = source.replace(marker, route + marker);
fs.writeFileSync(file, source, 'utf8');
console.log('Added POST /api/v1/orders/:id/pickup.');
console.log('This endpoint atomically moves READY -> SERVED and records payment status/method.');
