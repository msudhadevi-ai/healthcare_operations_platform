import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create clinic
  const clinic = await prisma.clinic.upsert({
    where: { id: "seed-clinic-001" },
    update: {},
    create: {
      id: "seed-clinic-001",
      name: "Apthal Eye Clinic",
      address: "123 Vision Street",
      phone: "+1-555-0100",
      email: "admin@apthalclinic.com",
    },
  });

  console.log("Clinic created:", clinic.name);

  // Create users
  const users = [
    { name: "Dr. Admin",        email: "admin@apthal.com",       role: "ADMIN"        as const, password: "Admin@1234"       },
    { name: "Dr. Sarah Eye",    email: "doctor@apthal.com",      role: "DOCTOR"       as const, password: "Doctor@1234"      },
    { name: "Alex Reception",   email: "reception@apthal.com",   role: "RECEPTIONIST" as const, password: "Reception@1234"   },
    { name: "Sam Pharmacy",     email: "pharmacy@apthal.com",    role: "PHARMACIST"   as const, password: "Pharmacy@1234"    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        clinicId: clinic.id,
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
      },
    });
    console.log(`User created: ${user.name} (${user.role}) — ${u.email} / ${u.password}`);
  }

  // Seed a few medicines
  const medicines = [
    { name: "Tobramycin Eye Drops",   genericName: "Tobramycin 0.3%",    category: "Eye Drops",  unit: "ml",      quantity: 50,  reorderLevel: 10, unitPrice: 8.50  },
    { name: "Timolol Eye Drops",      genericName: "Timolol Maleate 0.5%", category: "Eye Drops", unit: "ml",      quantity: 30,  reorderLevel: 10, unitPrice: 12.00 },
    { name: "Prednisolone Eye Drops", genericName: "Prednisolone 1%",     category: "Eye Drops",  unit: "ml",      quantity: 40,  reorderLevel: 10, unitPrice: 9.75  },
    { name: "Atropine Eye Drops",     genericName: "Atropine Sulfate 1%", category: "Eye Drops",  unit: "ml",      quantity: 5,   reorderLevel: 10, unitPrice: 6.00  },
    { name: "Vitamin A Capsules",     genericName: "Retinol",             category: "Oral",       unit: "capsules", quantity: 200, reorderLevel: 30, unitPrice: 0.25  },
  ];

  for (const m of medicines) {
    await prisma.medicine.create({
      data: { clinicId: clinic.id, ...m },
    });
  }
  console.log(`Seeded ${medicines.length} medicines`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
