import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const dischargeSummarySchema = z.object({
  visitId: z.string(),
  patientId: z.string(),

  // Visual Acuity
  rightEyeVisionUncorrected: z.string().optional(),
  leftEyeVisionUncorrected: z.string().optional(),
  rightEyeVisionCorrected: z.string().optional(),
  leftEyeVisionCorrected: z.string().optional(),

  // IOP
  rightEyeIOP: z.number().optional(),
  leftEyeIOP: z.number().optional(),

  // Refraction
  rightSphere: z.number().optional(),
  rightCylinder: z.number().optional(),
  rightAxis: z.number().int().optional(),
  leftSphere: z.number().optional(),
  leftCylinder: z.number().optional(),
  leftAxis: z.number().int().optional(),
  addPower: z.number().optional(),

  // Slit Lamp & Fundus
  slitLampRightEye: z.string().optional(),
  slitLampLeftEye: z.string().optional(),
  fundusRightEye: z.string().optional(),
  fundusLeftEye: z.string().optional(),

  // Other exams
  colorVision: z.string().optional(),
  fieldOfVision: z.string().optional(),
  ocularMotility: z.string().optional(),

  // Diagnosis
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  procedure: z.string().optional(),
  advice: z.string().optional(),
  followUpDate: z.string().optional(),

  // Prescriptions
  prescriptions: z
    .array(
      z.object({
        medicineId: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        duration: z.string(),
        route: z.string().optional(),
        instructions: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!["ADMIN", "DOCTOR"].includes(role ?? "")) {
    return NextResponse.json({ success: false, error: "Only doctors can create discharge summaries" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = dischargeSummarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { prescriptions, ...summaryData } = parsed.data;

  const summary = await prisma.dischargeSummary.create({
    data: {
      clinicId,
      doctorId: userId,
      ...summaryData,
      followUpDate: summaryData.followUpDate ? new Date(summaryData.followUpDate) : undefined,
      prescriptions: prescriptions
        ? { create: prescriptions }
        : undefined,
    },
    include: { prescriptions: { include: { medicine: true } } },
  });

  // Mark visit as discharged
  await prisma.visit.update({
    where: { id: parsed.data.visitId, clinicId },
    data: { status: "DISCHARGED" },
  });

  const meta = getRequestMeta(request);
  await writeAuditLog({
    clinicId,
    userId,
    action: "CREATE",
    resource: "DischargeSummary",
    resourceId: summary.id,
    ...meta,
  });

  return NextResponse.json({ success: true, data: summary }, { status: 201 });
}

export async function GET(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");

  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const visitId = searchParams.get("visitId");
  const patientId = searchParams.get("patientId");

  const summary = await prisma.dischargeSummary.findFirst({
    where: {
      clinicId,
      ...(visitId && { visitId }),
      ...(patientId && { patientId }),
    },
    include: {
      prescriptions: { include: { medicine: { select: { name: true, unit: true } } } },
      visit: {
        include: {
          patient: {
            select: { patientCode: true, firstName: true, lastName: true, dateOfBirth: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const meta = getRequestMeta(request);
  await writeAuditLog({
    clinicId,
    userId,
    action: "READ",
    resource: "DischargeSummary",
    resourceId: summary?.id,
    ...meta,
  });

  return NextResponse.json({ success: true, data: summary });
}
