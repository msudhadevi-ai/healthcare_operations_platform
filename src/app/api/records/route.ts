import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getDownloadPresignedUrl } from "@/lib/s3";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const confirmUploadSchema = z.object({
  patientId: z.string(),
  visitId: z.string().optional(),
  recordType: z.string(),
  title: z.string(),
  s3Key: z.string(),
  fileType: z.string(),
  fileSize: z.number().int().positive(),
});

// POST — confirm upload and save record metadata to DB
export async function POST(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");

  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = confirmUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await prisma.patientRecord.create({
    data: { clinicId, uploadedBy: userId, ...parsed.data },
  });

  return NextResponse.json({ success: true, data: record }, { status: 201 });
}

// GET — list records for a patient (returns fresh presigned download URLs)
export async function GET(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");

  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ success: false, error: "patientId required" }, { status: 400 });
  }

  const records = await prisma.patientRecord.findMany({
    where: { clinicId, patientId },
    orderBy: { uploadedAt: "desc" },
  });

  // Generate fresh presigned URLs — never cache these
  const recordsWithUrls = await Promise.all(
    records.map(async (r: { id: string; recordType: string; title: string; fileType: string; fileSize: number; uploadedAt: Date; visitId: string | null; s3Key: string }) => ({
      id: r.id,
      recordType: r.recordType,
      title: r.title,
      fileType: r.fileType,
      fileSize: r.fileSize,
      uploadedAt: r.uploadedAt,
      visitId: r.visitId,
      downloadUrl: await getDownloadPresignedUrl(r.s3Key), // s3Key never sent to client
    }))
  );

  const meta = getRequestMeta(request);
  await writeAuditLog({
    clinicId,
    userId,
    action: "READ",
    resource: "PatientRecord",
    ...meta,
    details: { patientId, count: records.length },
  });

  return NextResponse.json({ success: true, data: recordsWithUrls });
}
