import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { generatePatientCode } from "@/lib/utils";

const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/patients — list patients for the clinic
export async function GET(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");
  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where = {
    clinicId,
    isActive: true,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { patientCode: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        patientCode: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        createdAt: true,
      },
    }),
    prisma.patient.count({ where }),
  ]);

  const meta = getRequestMeta(request);
  await writeAuditLog({
    clinicId,
    userId,
    action: "READ",
    resource: "Patient",
    ...meta,
    details: { count: patients.length },
  });

  return NextResponse.json({
    success: true,
    data: patients,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/patients — register new patient
export async function POST(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "ADMIN" && role !== "RECEPTIONIST" && role !== "DOCTOR") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const count = await prisma.patient.count({ where: { clinicId } });
  const patientCode = generatePatientCode(count);

  const patient = await prisma.patient.create({
    data: {
      clinicId,
      patientCode,
      ...parsed.data,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
    },
  });

  const meta = getRequestMeta(request);
  await writeAuditLog({
    clinicId,
    userId,
    action: "CREATE",
    resource: "Patient",
    resourceId: patient.id,
    ...meta,
  });

  return NextResponse.json({ success: true, data: patient }, { status: 201 });
}
