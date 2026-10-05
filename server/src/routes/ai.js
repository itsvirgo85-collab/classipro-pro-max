import {Router} from 'express';
import OpenAI from 'openai';
import {auth} from '../middleware/auth.js';
const r=Router();
const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
async function ask(prompt){
 if(!client) return {text:'AI is not configured. Add OPENAI_API_KEY on the server to enable production AI.'};
 const x=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',input:prompt});
 return {text:x.output_text};
}
r.post('/listing-writer',auth,async(req,res,next)=>{try{res.json(await ask(`Write a concise marketplace listing for: ${JSON.stringify(req.body)}. Return title and description only.`))}catch(e){next(e)}});
r.post('/category',auth,async(req,res,next)=>{try{res.json(await ask(`Classify this marketplace item into one category: Vehicles, Property, Electronics, Services, Jobs, Fashion, Home & Garden. Item: ${req.body.text}`))}catch(e){next(e)}});
r.post('/price',auth,async(req,res,next)=>{try{res.json(await ask(`Suggest a pricing range in PKR for this marketplace item. Clearly say this is an estimate and list factors. Item: ${req.body.text}`))}catch(e){next(e)}});
r.post('/search',auth,async(req,res,next)=>{try{res.json(await ask(`Turn this natural-language marketplace request into concise search filters/keywords: ${req.body.text}`))}catch(e){next(e)}});
export default r;
