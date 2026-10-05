import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import {PrismaClient} from '@prisma/client';
const prisma=new PrismaClient();
const r=Router();
const sign=u=>jwt.sign({sub:u.id,role:u.role},process.env.JWT_SECRET,{expiresIn:'7d'});
const safe=u=>({id:u.id,email:u.email,name:u.name,phone:u.phone,avatarUrl:u.avatarUrl,bio:u.bio,role:u.role,verified:u.verified});
r.post('/register',async(req,res,next)=>{
 try{
  const d=z.object({email:z.string().email(),password:z.string().min(8),name:z.string().min(2).max(80)}).parse(req.body);
  const exists=await prisma.user.findUnique({where:{email:d.email.toLowerCase()}});
  if(exists) return res.status(409).json({error:'Email already registered'});
  const u=await prisma.user.create({data:{email:d.email.toLowerCase(),passwordHash:await bcrypt.hash(d.password,12),name:d.name}});
  res.status(201).json({token:sign(u),user:safe(u)});
 }catch(e){next(e)}
});
r.post('/login',async(req,res,next)=>{
 try{
  const d=z.object({email:z.string().email(),password:z.string()}).parse(req.body);
  const u=await prisma.user.findUnique({where:{email:d.email.toLowerCase()}});
  if(!u || !(await bcrypt.compare(d.password,u.passwordHash))) return res.status(401).json({error:'Invalid email or password'});
  res.json({token:sign(u),user:safe(u)});
 }catch(e){next(e)}
});
export default r;
