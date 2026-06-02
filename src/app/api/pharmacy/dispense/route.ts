import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const dispenseSchema = z.object({
  visitId: z.string(),
  medicineId: z.string(),
  quantity: z.number().int().positive(),
});

export async function POST(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!["ADMIN", "PHARMACIST", "DOCTOR"].includes(role ?? "")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = dispenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { visitId, medicineId, quantity } = parsed.data;

  // Check stock availability
  const medicine = await prisma.medicine.findFirst({
    where: { id: medicineId, clinicId, isActive: true },
  });

  if (!medicine) {
    return NextResponse.json({ success: false, error: "Medicine not found" }, { status: 404 });
  }

  if (medicine.quantity < quantity) {
    return NextResponse.json(
      { success: false, error: `Insufficient stock. Available: ${medicine.quantity}` },
      { status: 400 }
    );
  }

  // Deduct stock and create dispensing record atomically
  const [dispensing] = await prisma.$transaction([
    prisma.dispensing.create({
      data: { clinicId, visitId, medicineId, quantity, dispensedBy: userId },
    }),
    prisma.medicine.update({
      where: { id: medicineId },
      data: { quantity: { decrement: quantity } },
    }),
  ]);

  const meta = getRequestMeta(request);
  await writeAuditLog({
    clinicId,
    userId,
    action: "CREATE",
    resource: "Dispensing",
    resourceId: dispensing.id,
    ...meta,
    details: { medicineId, quantity },
  });

  return NextResponse.json({ success: true, data: dispensing }, { status: 201 });
}
