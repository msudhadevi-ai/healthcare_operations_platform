import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const medicineSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1),
  quantity: z.number().int().min(0),
  reorderLevel: z.number().int().min(0).default(10),
  unitPrice: z.number().min(0),
  batchNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  expiryDate: z.string().optional(),
});

export async function GET(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  if (!clinicId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const lowStock = searchParams.get("lowStock") === "true";

  const medicines = await prisma.medicine.findMany({
    where: {
      clinicId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { genericName: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(lowStock && {
        quantity: { lte: prisma.medicine.fields.reorderLevel },
      }),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ success: true, data: medicines });
}

export async function POST(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!["ADMIN", "PHARMACIST"].includes(role ?? "")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = medicineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const medicine = await prisma.medicine.create({
    data: {
      clinicId,
      ...parsed.data,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : undefined,
    },
  });

  const meta = getRequestMeta(request);
  await writeAuditLog({
    clinicId,
    userId,
    action: "CREATE",
    resource: "Medicine",
    resourceId: medicine.id,
    ...meta,
  });

  return NextResponse.json({ success: true, data: medicine }, { status: 201 });
}
