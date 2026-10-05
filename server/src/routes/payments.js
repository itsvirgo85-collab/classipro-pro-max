import {Router} from 'express';
import Stripe from 'stripe';
import {PrismaClient} from '@prisma/client';
import {auth} from '../middleware/auth.js';
const prisma=new PrismaClient(); const r=Router();
const stripe=process.env.STRIPE_SECRET_KEY?new Stripe(process.env.STRIPE_SECRET_KEY):null;
r.post('/checkout',auth,async(req,res,next)=>{
 try{
  if(!stripe)return res.status(503).json({error:'Payments are not configured. Add Stripe credentials.'});
  const plan=req.body.plan==='business'?'business':'premium';
  const price=plan==='business'?process.env.STRIPE_BUSINESS_PRICE_ID:process.env.STRIPE_PREMIUM_PRICE_ID;
  if(!price)return res.status(503).json({error:'Stripe price ID is not configured'});
  const session=await stripe.checkout.sessions.create({mode:'subscription',line_items:[{price,quantity:1}],customer_email:req.user.email,success_url:`${process.env.CLIENT_URL}/?payment=success`,cancel_url:`${process.env.CLIENT_URL}/?payment=cancelled`,metadata:{userId:req.user.id,plan}});
  res.json({url:session.url});
 }catch(e){next(e)}
});
r.post('/webhook',async(req,res)=>{
 if(!stripe)return res.status(503).end();
 try{
  const event=stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);
  if(event.type==='checkout.session.completed'){
   const s=event.data.object; const userId=s.metadata?.userId;
   if(userId) await prisma.subscription.upsert({where:{id:`stripe-${s.subscription}`},update:{status:'ACTIVE',plan:s.metadata.plan,stripeSubscriptionId:s.subscription},create:{id:`stripe-${s.subscription}`,userId,plan:s.metadata.plan,status:'ACTIVE',stripeSubscriptionId:s.subscription}});
  }
  res.json({received:true});
 }catch(e){res.status(400).send(`Webhook Error: ${e.message}`)}
});
export default r;
