import { NextResponse } from "next/server";
import { z } from "zod";
import { getUploadPresignedUrl } from "@/lib/s3";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const uploadSchema = z.object({
  patientId: z.string(),
  fileType: z.string(),
  fileExtension: z.string(),
  recordType: z.string(),
  title: z.string(),
  fileSize: z.number().int().positive(),
  visitId: z.string().optional(),
});

// Returns a presigned S3 upload URL — client uploads directly to S3
// The s3Key is then confirmed via POST /api/records
export async function POST(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");

  if (!clinicId || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  // 100MB max file size
  if (parsed.data.fileSize > 100 * 1024 * 1024) {
    return NextResponse.json({ success: false, error: "File too large (max 100MB)" }, { status: 400 });
  }

  const { uploadUrl, s3Key } = await getUploadPresignedUrl({
    clinicId,
    patientId: parsed.data.patientId,
    fileType: parsed.data.fileType,
    fileExtension: parsed.data.fileExtension,
  });

  const meta = getRequestMeta(request);
  await writeAuditLog({
    clinicId,
    userId,
    action: "UPLOAD",
    resource: "PatientRecord",
    ...meta,
    details: { recordType: parsed.data.recordType, patientId: parsed.data.patientId },
  });

  return NextResponse.json({ success: true, data: { uploadUrl, s3Key } });
}
