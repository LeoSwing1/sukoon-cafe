import {Router} from 'express';
import {setupOwner,login,me,clearSession,requireAuth} from '../auth.js';
export const authRouter=Router();
// Session and setup responses must never be cached by browsers or a CDN.
authRouter.use((_req,res,next)=>{res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, private");res.setHeader("Pragma","no-cache");next();});
authRouter.get('/setup-status',async(_req,res,next)=>{try{const {pool}=await import('../db/client.js');const r=await pool.query("SELECT COUNT(*)::int AS n FROM users WHERE role='OWNER'");res.json({needsSetup:Number(r.rows[0].n)===0});}catch(e){next(e);}});
authRouter.post('/setup', (req,res,next)=>{void setupOwner(req,res).catch(next)});
authRouter.post('/login',(req,res,next)=>{void login(req,res).catch(next)});
authRouter.get('/me',(req,res,next)=>{void me(req,res).catch(next)});
authRouter.post('/logout',requireAuth(),(_req,res)=>{clearSession(res);res.json({ok:true});});
