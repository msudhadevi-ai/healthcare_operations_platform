import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const createVisitSchema = z.object({
  patientId: z.string(),
  chiefComplaint: z.string().optional(),
  visitDate: z.string().optional(),
});

const addBillingSchema = z.object({
  visitId: z.string(),
  items: z.array(
    z.object({
      description: z.string(),
      amount: z.number().positive(),
      category: z.enum(["CONSULTATION", "MEDICINE", "PROCEDURE", "TEST", "OTHER"]),
    })
  ),
  paidAmount: z.number().min(0).optional(),
});

export async function GET(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");
  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const patientId = searchParams.get("patientId");

  const where = {
    clinicId,
    ...(date && {
      visitDate: {
        gte: new Date(date + "T00:00:00Z"),
        lte: new Date(date + "T23:59:59Z"),
      },
    }),
    ...(patientId && { patientId }),
  };

  const visits = await prisma.visit.findMany({
    where,
    include: {
      patient: {
        select: { patientCode: true, firstName: true, lastName: true, phone: true },
      },
      billingItems: true,
      dischargeSummary: { select: { id: true } },
    },
    orderBy: { visitDate: "desc" },
  });

  return NextResponse.json({ success: true, data: visits });
}

export async function POST(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!["ADMIN", "RECEPTIONIST", "DOCTOR"].includes(role ?? "")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Handle billing update
  if (body.type === "billing") {
    const parsed = addBillingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { visitId, items, paidAmount } = parsed.data;
    const total = items.reduce((sum, i) => sum + i.amount, 0);

    const [, visit] = await prisma.$transaction([
      prisma.billingItem.createMany({
        data: items.map((i) => ({ ...i, visitId })),
      }),
      prisma.visit.update({
        where: { id: visitId, clinicId },
        data: {
          totalAmount: { increment: total },
          ...(paidAmount !== undefined && { paidAmount }),
          paymentStatus:
            paidAmount !== undefined
              ? paidAmount >= total
                ? "PAID"
                : paidAmount > 0
                ? "PARTIAL"
                : "PENDING"
              : undefined,
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: visit });
  }

  // Create new visit
  const parsed = createVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const visit = await prisma.visit.create({
    data: {
      clinicId,
      patientId: parsed.data.patientId,
      chiefComplaint: parsed.data.chiefComplaint,
      visitDate: parsed.data.visitDate ? new Date(parsed.data.visitDate) : undefined,
    },
    include: {
      patient: {
        select: { patientCode: true, firstName: true, lastName: true },
      },
    },
  });

  const meta = getRequestMeta(request);
  await writeAuditLog({
    clinicId,
    userId,
    action: "CREATE",
    resource: "Visit",
    resourceId: visit.id,
    ...meta,
  });

  return NextResponse.json({ success: true, data: visit }, { status: 201 });
}
