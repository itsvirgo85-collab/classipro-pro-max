import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const categories = [
  ['Vehicles','vehicles'],['Property','property'],['Electronics','electronics'],
  ['Services','services'],['Jobs','jobs'],['Fashion','fashion'],['Home & Garden','home-garden']
];

async function main(){
  for (const [name,slug] of categories) await prisma.category.upsert({
    where:{slug}, update:{name}, create:{name,slug}
  });
  const email=process.env.ADMIN_EMAIL || 'admin@example.com';
  const password=process.env.ADMIN_PASSWORD || 'ChangeMe-Immediately-123!';
  const passwordHash=await bcrypt.hash(password,12);
  await prisma.user.upsert({
    where:{email}, update:{role:'ADMIN', passwordHash},
    create:{email,passwordHash,name:'ClassiPro Admin',role:'ADMIN',verified:true}
  });
  console.log('Seed complete. Admin:', email);
}
main().finally(()=>prisma.$disconnect());
