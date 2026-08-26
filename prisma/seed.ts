import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const studentPasswordHash = await bcrypt.hash("aluno123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@plataforma.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@plataforma.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "aluno@plataforma.com" },
    update: {},
    create: {
      name: "Aluno Teste",
      email: "aluno@plataforma.com",
      passwordHash: studentPasswordHash,
      role: "STUDENT",
    },
  });

  console.log("Seed concluído.");
  console.log("Admin:  admin@plataforma.com / admin123");
  console.log("Aluno:  aluno@plataforma.com / aluno123");
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
