import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient();
export async function auth(req,res,next){
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/,'');
    if(!token) return res.status(401).json({error:'Authentication required'});
    const p=jwt.verify(token,process.env.JWT_SECRET);
    const user=await prisma.user.findUnique({where:{id:p.sub}});
    if(!user) return res.status(401).json({error:'Invalid session'});
    req.user=user; next();
  }catch{res.status(401).json({error:'Invalid or expired session'});}
}
export function admin(req,res,next){if(req.user?.role!=='ADMIN') return res.status(403).json({error:'Admin access required'});next();}
export async function authSocket(socket,next){
  try{
    const token=socket.handshake.auth?.token;
    const p=jwt.verify(token,process.env.JWT_SECRET);
    const user=await prisma.user.findUnique({where:{id:p.sub}});
    if(!user) throw new Error();
    socket.user=user; next();
  }catch{next(new Error('Unauthorized'))}
}
