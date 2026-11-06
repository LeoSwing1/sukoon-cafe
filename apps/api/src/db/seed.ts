import { eq } from 'drizzle-orm';
import { db, pool } from './client.js';
import { cafeTables, menuCategories, menuItems } from './schema.js';

async function seed(){
 // Hide unrelated starter placeholders; the public menu follows the photographed Sukoon Diaries catalogue.
 for (const placeholder of ['Classic Cappuccino','Cold Coffee','Masala Fries','Veg Sandwich','Chocolate Brownie']) {
   await db.update(menuItems).set({available:false}).where(eq(menuItems.name,placeholder));
 }


 // Sukoon Diaries printed menu transcription. Prices are editable in Admin → Menu catalogue.
 const menuGroups: Record<string, {name:string;description:string;price:number;cost:number}[]> = {
  "Cold Coffee": [
   {name:"Single & Chilled Cold Coffee",description:"Chilled classic cold coffee",price:59,cost:22},
   {name:"Pyaar Mein Dooba Cold Coffee",description:"Extra chocolate, extra drama",price:69,cost:28},
   {name:"Breakup Booster",description:"Strong enough to forget the ex",price:69,cost:27},
   {name:"Rich Boi Cold Coffee",description:"Because your wallet said no, but your heart said yes",price:69,cost:29},
   {name:"Cold Coffee, Hot Gossip",description:"Best enjoyed with friends",price:69,cost:27},
   {name:"Sukoon Special Cold Coffee",description:"Sip. Relax. Repeat.",price:79,cost:32},
   {name:"Ex Ki Yaad Cold Coffee",description:"Bitter, but addictive",price:89,cost:36}
  ],
  "Chai & Adrak": [
   {name:"Mummy Wali Adrak Chai",description:"No one makes it like her",price:20,cost:7},
   {name:"Special Elaichi Chai",description:"For the 5-minute break that lasts 2 hours",price:20,cost:8},
   {name:"Gupshup Adrak Chai",description:"Chai + unlimited bakchodi",price:30,cost:10}
  ],
  "Maggi": [
   {name:"2-Minute Maggi",description:"Takes 5 minutes, obviously",price:30,cost:12},
   {name:"Buttery Maggi",description:"Simple, emotional & affordable",price:40,cost:16},
   {name:"Extra Masala Maggi",description:"Extra masala, extra trauma",price:50,cost:19},
   {name:"Maggi Mein Cheese",description:"Everything.",price:60,cost:25},
   {name:"Ameeron Ki Maggi",description:"Loaded with everything",price:70,cost:30}
  ],
  "Momos": [
   {name:"Single Veg Momos",description:"Steaming hot momos",price:30,cost:14},
   {name:"Single Paneer Momos",description:"Steaming paneer momos",price:40,cost:19},
   {name:"Dhoka Fried Momos (Veg)",description:"Looks innocent, tastes dangerous",price:40,cost:18},
   {name:"Dhoka Fried Momos (Paneer)",description:"Crispy paneer momos",price:50,cost:23},
   {name:"Garam Gossip Garlic Momos (Veg)",description:"Hotter than your group chat",price:50,cost:23},
   {name:"Garam Gossip Garlic Momos (Paneer)",description:"Garlic-loaded paneer momos",price:70,cost:32},
   {name:"Crush Wale Crunchy Momos (Veg)",description:"You'll keep coming back",price:70,cost:31},
   {name:"Crush Wale Crunchy Momos (Paneer)",description:"Crunchy paneer momos",price:90,cost:40}
  ],
  "Burgers": [
   {name:"Single Patty Burger",description:"Double feelings, single patty",price:35,cost:17},
   {name:"Broccoli Cheese Burger",description:"Fresh, cheesy cafe-style burger",price:50,cost:24},
   {name:"Big Cheese Burger",description:"Big enough to share (or not)",price:80,cost:39},
   {name:"Ek Burger (Extra Crunch)",description:"A crunchy cafe favourite",price:80,cost:38},
   {name:"Cheese Kurkure Burger",description:"But worth it",price:110,cost:53}
  ],
  "Sandwiches": [
   {name:"Veg Grilled Sandwich",description:"Mixed vegetables, cheese & seasoning",price:50,cost:23},
   {name:"Cheese Sandwich",description:"Loaded with melted cheese",price:70,cost:33},
   {name:"Corn & Cheese Sandwich",description:"Sweet corn, cheese",price:90,cost:42}
  ],
  "Mojitos": [
   {name:"Nimbu Paani With Attitude",description:"Lime and mint",price:69,cost:22},
   {name:"Not Anymore Mojito",description:"Strawberry, blackcurrant and pomegranate",price:69,cost:28},
   {name:"Weekend Wala Mojito",description:"Blue paradise, berry blast",price:69,cost:28},
   {name:"Sukoon Mojito",description:"Sip. Relax. Repeat. (Apple)",price:69,cost:26}
  ],
  "Special Tea": [
   {name:"Kariyapa Tea",description:"A special tea selection",price:69,cost:25},
   {name:"Grey Tea",description:"A fragrant tea break",price:99,cost:35},
   {name:"Neela Samandar",description:"A refreshing special tea",price:99,cost:38}
  ],
  "Fresh Juices": [
   {name:"Sweet Lime Juice",description:"Freshly squeezed mosambi",price:89,cost:32},
   {name:"Orange Sunrise",description:"Fresh orange juice",price:99,cost:38},
   {name:"Watermelon Cooler",description:"Seasonal watermelon juice",price:79,cost:28},
   {name:"Pineapple Punch",description:"Tropical pineapple juice",price:99,cost:39},
   {name:"ABC Detox Juice",description:"Apple, beetroot and carrot",price:119,cost:46}
  ],
  "Soft Drinks & Water": [
   {name:"Coca-Cola",description:"Chilled soft drink · sample listing",price:40,cost:25},
   {name:"Sprite",description:"Chilled lemon-lime soft drink · sample listing",price:40,cost:25},
   {name:"Thums Up",description:"Chilled cola · sample listing",price:40,cost:25},
   {name:"Mineral Water",description:"Packaged drinking water",price:20,cost:10},
   {name:"Soda",description:"Chilled soda water",price:30,cost:12}
  ],
  "Hot Coffee": [
   {name:"Classic Cappuccino",description:"Espresso with steamed milk foam",price:109,cost:38},
   {name:"Cafe Latte",description:"Smooth espresso and steamed milk",price:119,cost:42},
   {name:"Americano",description:"Espresso topped with hot water",price:89,cost:28},
   {name:"Hot Chocolate",description:"Rich cocoa and steamed milk",price:119,cost:45},
   {name:"Hazelnut Hot Coffee",description:"Aromatic hazelnut cafe coffee",price:129,cost:48}
  ],
  "Fries & Quick Bites": [
   {name:"Classic Salted Fries",description:"Golden crispy fries",price:69,cost:28},
   {name:"Peri Peri Fries",description:"Crispy fries with peri peri seasoning",price:89,cost:36},
   {name:"Cheese Loaded Fries",description:"Fries topped with creamy cheese",price:119,cost:49},
   {name:"Garlic Bread",description:"Toasted bread with garlic butter",price:89,cost:35},
   {name:"Cheese Garlic Bread",description:"Garlic bread with melted cheese",price:119,cost:48},
   {name:"Crispy Veg Nuggets",description:"Crunchy golden vegetable bites",price:99,cost:43}
  ],
  "Pizza & Pasta": [
   {name:"Classic Margherita Pizza",description:"Tomato, mozzarella and basil",price:179,cost:78},
   {name:"Farmhouse Pizza",description:"Onion, capsicum, tomato and cheese",price:229,cost:102},
   {name:"Paneer Tikka Pizza",description:"Spiced paneer and peppers",price:249,cost:112},
   {name:"White Sauce Pasta",description:"Creamy white sauce pasta",price:169,cost:72},
   {name:"Red Sauce Pasta",description:"Tomato herb sauce pasta",price:159,cost:66},
   {name:"Pink Sauce Pasta",description:"Creamy tomato sauce pasta",price:189,cost:82}
  ],
  "Starters & Small Plates": [
   {name:"Chilli Potato",description:"Crispy potato tossed in chilli sauce",price:129,cost:54},
   {name:"Honey Chilli Potato",description:"Sweet, spicy and crunchy",price:149,cost:62},
   {name:"Veg Manchurian Dry",description:"Vegetable dumplings in Indo-Chinese sauce",price:149,cost:65},
   {name:"Paneer Chilli",description:"Paneer tossed with peppers and chilli",price:189,cost:86},
   {name:"Crispy Corn",description:"Crunchy corn with herbs and spices",price:139,cost:58},
   {name:"Spring Rolls",description:"Crispy vegetable spring rolls",price:119,cost:50}
  ],
  "Main Course": [
   {name:"Dal Tadka",description:"Yellow lentils tempered with spices",price:149,cost:62},
   {name:"Shahi Paneer",description:"Paneer in a rich creamy gravy",price:219,cost:96},
   {name:"Kadai Paneer",description:"Paneer with peppers and kadai masala",price:219,cost:94},
   {name:"Mix Veg",description:"Seasonal vegetables in Indian masala",price:179,cost:74},
   {name:"Chole Masala",description:"North Indian chickpea curry",price:159,cost:66},
   {name:"Jeera Rice",description:"Basmati rice tempered with cumin",price:119,cost:45},
   {name:"Veg Pulao",description:"Fragrant rice with vegetables",price:149,cost:58},
   {name:"Butter Naan",description:"Soft tandoor-style naan with butter",price:45,cost:17},
   {name:"Tawa Roti",description:"Whole wheat flatbread",price:20,cost:7}
  ],
  "Desserts & Cakes": [
   {name:"Chocolate Brownie",description:"Fudgy chocolate brownie",price:99,cost:42},
   {name:"Sizzling Brownie",description:"Warm brownie with ice cream",price:179,cost:78},
   {name:"Chocolate Truffle Pastry",description:"Rich chocolate layered pastry",price:99,cost:44},
   {name:"Red Velvet Pastry",description:"Soft red velvet slice",price:119,cost:52},
   {name:"Blueberry Cheesecake",description:"Creamy cheesecake slice",price:159,cost:72},
   {name:"Choco Lava Cake",description:"Warm cake with molten centre",price:119,cost:49},
   {name:"Gulab Jamun (2 pcs)",description:"Warm milk-solid dumplings in syrup",price:69,cost:26},
   {name:"Vanilla Scoop",description:"One scoop of vanilla ice cream",price:49,cost:18},
   {name:"Chocolate Scoop",description:"One scoop of chocolate ice cream",price:59,cost:22}
  ],
  "Breakfast & All Day": [
   {name:"Aloo Paratha with Curd",description:"Stuffed paratha served with curd",price:99,cost:42},
   {name:"Masala Cheese Toast",description:"Toasted bread with spiced cheese",price:89,cost:36},
   {name:"Veg Poha",description:"Light flattened rice with peanuts",price:69,cost:25},
   {name:"Classic Pancakes",description:"Fluffy pancakes with syrup",price:129,cost:54}
  ],
  "Funny Mocktail Combos": [
   {name:"Budget Mocktail + Maggi Combo",description:"Budget mocktail + Maggi + gossip session",price:99,cost:48},
   {name:"Gossip Magic Combo",description:"Gossip Maggi + Momos + 2 Chai",price:99,cost:48},
   {name:"Pyaar Ka Punch Combo",description:"2 Mojitos + 2 Momos",price:119,cost:57},
   {name:"Breakup Berry Combo",description:"Momos + Cold Coffee",price:119,cost:55},
   {name:"Single & Sparkling Combo",description:"Maggi + Fries + Couple Goals Combo",price:149,cost:69},
   {name:"Sukoon Splash Combo",description:"Loaded Maggi + Momos + Cold Coffee",price:149,cost:72}
  ]
 };
 for (const [groupName, products] of Object.entries(menuGroups)) {
  let [category]=await db.select().from(menuCategories).where(eq(menuCategories.name,groupName)).limit(1);
  if(!category){[category]=await db.insert(menuCategories).values({name:groupName,sortOrder:Object.keys(menuGroups).indexOf(groupName)+1}).returning();}
  for(const product of products){
   const [found]=await db.select().from(menuItems).where(eq(menuItems.name,product.name)).limit(1);
   if(!found) await db.insert(menuItems).values({categoryId:category.id,name:product.name,description:product.description,pricePaise:product.price*100,costPaise:product.cost*100,demoData:true});
   else await db.update(menuItems).set({categoryId:category.id,description:product.description,pricePaise:product.price*100,costPaise:product.cost*100,available:true}).where(eq(menuItems.id,found.id));
  }
 }

 const existingTables=await db.select().from(cafeTables).limit(1);
 if(!existingTables.length) await db.insert(cafeTables).values(Array.from({length:10},(_,i)=>({tableNumber:String(i+1),qrToken:`sukoon-table-${i+1}`})));

 // Demo operating data is inserted only when the relevant tables are empty.
 const inventoryCount=await pool.query('SELECT COUNT(*)::int AS n FROM inventory_items');
 if(Number(inventoryCount.rows[0].n)===0){
  const stock=[['Coffee beans','kg',8,2,85000],['Whole milk','L',18,5,6500],['Chocolate sauce','bottle',6,2,18000],['Brownie mix','kg',5,1,32000],['Potatoes','kg',15,4,4500],['Bread loaf','pcs',12,3,5500],['Cheese slices','pcs',80,20,120],['Paper cups','pcs',250,50,350],['Takeaway boxes','pcs',120,30,500],['Sugar','kg',10,2,4800]];
  for(const x of stock) await pool.query('INSERT INTO inventory_items(name,unit,stock_quantity,reorder_level,unit_cost_paise) VALUES($1,$2,$3,$4,$5)',x);
 }
 const staffCount=await pool.query('SELECT COUNT(*)::int AS n FROM staff_profiles');
 if(Number(staffCount.rows[0].n)===0){
  for(const x of [['Cafe Owner','owner@sukoon.demo','9000000001','OWNER'],['Shift Manager','manager@sukoon.demo','9000000002','MANAGER'],['Counter Cashier','cashier@sukoon.demo','9000000003','CASHIER'],['Kitchen Team','kitchen@sukoon.demo','9000000004','KITCHEN']]) await pool.query('INSERT INTO staff_profiles(name,email,phone,role) VALUES($1,$2,$3,$4)',x);
 }
 const promoCount=await pool.query('SELECT COUNT(*)::int AS n FROM promotions');
 if(Number(promoCount.rows[0].n)===0){
  await pool.query(`INSERT INTO promotions(name,code,description,discount_type,discount_value,starts_at,ends_at,active) VALUES
  ('Welcome to Sukoon','SUKOON10','10% off your first visit','PERCENT',10,now()-interval '1 day',now()+interval '30 days',true),
  ('Coffee & Brownie Combo','COFFEE20','₹20 off selected cafe combos','FIXED',2000,now()-interval '1 day',now()+interval '14 days',true)`);
 }
 const expenseCount=await pool.query('SELECT COUNT(*)::int AS n FROM cafe_expenses');
 if(Number(expenseCount.rows[0].n)===0){
  await pool.query(`INSERT INTO cafe_expenses(category,description,amount_paise,expense_date) VALUES
  ('Rent','Monthly cafe rent',1800000,current_date),
  ('Utilities','Electricity and water',425000,current_date-1),
  ('Ingredients','Weekly ingredients purchase',685000,current_date-2),
  ('Packaging','Takeaway packaging stock',145000,current_date-3)`);
 }

 const supplierCount=await pool.query('SELECT COUNT(*)::int AS n FROM suppliers');
 if(Number(supplierCount.rows[0].n)===0){
  for(const x of [['Fresh Dairy Distributors','9000000011','dairy@example.demo'],['City Coffee Traders','9000000012','coffee@example.demo'],['Cafe Packaging Hub','9000000013','packaging@example.demo']]) await pool.query('INSERT INTO suppliers(name,phone,email) VALUES($1,$2,$3)',x);
 }
 const settlementCount=await pool.query('SELECT COUNT(*)::int AS n FROM settlement_records');
 if(Number(settlementCount.rows[0].n)===0){
  await pool.query(`INSERT INTO settlement_records(platform,reference,gross_paise,commission_paise,adjustment_paise,net_paise,settlement_status,settled_at) VALUES
  ('SWIGGY','DEMO-SWG-001',185000,27750,0,157250,'SETTLED',now()-interval '2 days'),
  ('ZOMATO','DEMO-ZOM-001',142000,21300,0,120700,'PENDING',NULL)`);
 }

 const orderCount=await pool.query('SELECT COUNT(*)::int AS n FROM orders');
 if(Number(orderCount.rows[0].n)===0){
  const catalogue=await pool.query('SELECT id,name,price_paise FROM menu_items WHERE available=true ORDER BY id');
  const tableRows=await pool.query('SELECT id FROM cafe_tables ORDER BY id LIMIT 5');
  const demoOrders=[
   ['DINE_IN',0,0,0],['WALK_IN',1,0,0],['TAKEAWAY',2,0,0],['SWIGGY',3,12000,1800],['ZOMATO',4,10000,1500],
   ['DINE_IN',0,0,0],['WALK_IN',1,0,0],['WEBSITE',2,0,0],['SWIGGY',3,15000,2250],['ZOMATO',4,8000,1200],
   ['DINE_IN',0,0,0],['TAKEAWAY',1,0,0]
  ];
  for(let i=0;i<demoOrders.length;i++){
   const [source,idx,platformFee]=demoOrders[i] as [string,number,number];
   const item1=catalogue.rows[i%catalogue.rows.length],item2=catalogue.rows[(i+1)%catalogue.rows.length];
   const lines=[{item:item1,qty:1+(i%2)},{item:item2,qty:i%3===0?1:0}].filter(x=>x.qty>0);
   const subtotal=lines.reduce((n,x)=>n+x.item.price_paise*x.qty,0),tax=Math.round(subtotal*500/10000),total=subtotal+tax;
   const createdAt=new Date(Date.now()-((11-i)*5*60*60*1000));
   const order=await pool.query(`INSERT INTO orders(order_number,source,status,table_id,external_platform_order_id,customer_name,customer_phone,delivery_address,payment_method,platform_subtotal_paise,platform_commission_paise,subtotal_paise,tax_paise,discount_paise,total_paise,payment_status,demo_data,created_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,$14,$15,true,$16) RETURNING id`,
    [`SK-DEMO-${String(i+1).padStart(4,'0')}`,source,i%4===0?'COMPLETED':i%4===1?'READY':'PREPARING',source==='DINE_IN'?tableRows.rows[idx]?.id:null,['SWIGGY','ZOMATO'].includes(source)?`${source}-DEMO-${7000+i}`:null,['Aarav','Meera','Kabir','Ananya','Riya','Ishaan'][i%6],`90000000${String(i).padStart(2,'0')}`,source==='SWIGGY'||source==='ZOMATO'?'Ashiyana, Lucknow':null,['SWIGGY','ZOMATO'].includes(source)?source:'UPI',['SWIGGY','ZOMATO'].includes(source)?subtotal:null,platformFee,subtotal,tax,total,i%5===0?'PENDING':'PAID',createdAt]);
   for(const line of lines) await pool.query('INSERT INTO order_items(order_id,menu_item_id,item_name_snapshot,quantity,unit_price_paise) VALUES($1,$2,$3,$4,$5)',[order.rows[0].id,line.item.id,line.item.name,line.qty,line.item.price_paise]);
   await pool.query('INSERT INTO invoices(order_id,invoice_number,subtotal_paise,tax_paise,discount_paise,total_paise,payment_status,issued_at) VALUES($1,$2,$3,$4,0,$5,$6,$7)',[order.rows[0].id,`INV-DEMO-${String(i+1).padStart(4,'0')}`,subtotal,tax,total,i%5===0?'PENDING':'PAID',createdAt]);
   await pool.query('INSERT INTO order_status_events(order_id,from_status,to_status,note,created_at) VALUES($1,NULL,$2,$3,$4)',[order.rows[0].id,i%4===0?'COMPLETED':i%4===1?'READY':'PREPARING','Demo seed order',createdAt]);
  }
 }

 console.log('Sukoon demo menu and tables are ready.');
}
seed().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>pool.end());
