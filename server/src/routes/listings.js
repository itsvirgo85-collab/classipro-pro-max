import {Router} from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import {PrismaClient} from '@prisma/client';
import {auth} from '../middleware/auth.js';
const prisma=new PrismaClient(); const r=Router();
const upload=multer({
 storage:multer.diskStorage({
  destination:(_,__,cb)=>cb(null,path.resolve(process.env.UPLOAD_DIR||'./uploads')),
  filename:(_,file,cb)=>cb(null,crypto.randomUUID()+path.extname(file.originalname).toLowerCase())
 }),
 limits:{fileSize:Number(process.env.MAX_UPLOAD_MB||8)*1024*1024},
 fileFilter:(_,f,cb)=>cb(null,/^image\/(jpeg|png|webp|gif)$/.test(f.mimetype))
});
r.get('/',async(req,res,next)=>{
 try{
  const {q,category,status='ACTIVE',min,max,location,page='1',limit='20'}=req.query;
  const where={status, ...(category?{category:{slug:category}}:{}), ...(location?{location:{contains:location,mode:'insensitive'}}:{}),
   ...(q?{OR:[{title:{contains:q,mode:'insensitive'}},{description:{contains:q,mode:'insensitive'}}]}:{}),
   ...(min?{price:{gte:Number(min)}}:{}), ...(max?{price:{lte:Number(max)}}:{})};
  const skip=(Number(page)-1)*Number(limit);
  const [items,total]=await Promise.all([
   prisma.listing.findMany({where,skip,take:Number(limit),orderBy:[{featured:'desc'},{createdAt:'desc'}],
    include:{category:true,seller:{select:{id:true,name:true,avatarUrl:true,verified:true}}}}),
   prisma.listing.count({where})
  ]);
  res.json({items,total,page:Number(page),pages:Math.ceil(total/Number(limit))});
 }catch(e){next(e)}
});
r.get('/:id',async(req,res,next)=>{try{const x=await prisma.listing.findUnique({where:{id:req.params.id},include:{category:true,seller:{select:{id:true,name:true,avatarUrl:true,bio:true,verified:true}}}});if(!x)return res.status(404).json({error:'Listing not found'});res.json(x)}catch(e){next(e)}});
r.post('/',auth,upload.array('images',8),async(req,res,next)=>{
 try{
  const category=await prisma.category.findUnique({where:{slug:req.body.category}});
  if(!category)return res.status(400).json({error:'Invalid category'});
  const images=(req.files||[]).map(f=>`/uploads/${f.filename}`);
  const x=await prisma.listing.create({data:{title:req.body.title?.trim(),description:req.body.description?.trim(),price:Number(req.body.price),location:req.body.location?.trim(),condition:req.body.condition||null,images,sellerId:req.user.id,categoryId:category.id}});
  res.status(201).json(x);
 }catch(e){next(e)}
});
r.post('/:id/favorite',auth,async(req,res,next)=>{
 try{await prisma.favorite.create({data:{userId:req.user.id,listingId:req.params.id}});res.json({ok:true})}catch(e){if(e.code==='P2002')return res.json({ok:true});next(e)}
});
r.delete('/:id/favorite',auth,async(req,res,next)=>{try{await prisma.favorite.deleteMany({where:{userId:req.user.id,listingId:req.params.id}});res.json({ok:true})}catch(e){next(e)}});
export default r;
