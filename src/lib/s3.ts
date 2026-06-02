import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;
const PRESIGNED_URL_EXPIRES = 300; // 5 minutes — short-lived for HIPAA

/**
 * Generate a presigned upload URL for direct-to-S3 upload.
 * The s3Key is returned and stored in the DB — never exposed in client URLs.
 */
export async function getUploadPresignedUrl(params: {
  clinicId: string;
  patientId: string;
  fileType: string;
  fileExtension: string;
}): Promise<{ uploadUrl: string; s3Key: string }> {
  const s3Key = `clinics/${params.clinicId}/patients/${params.patientId}/${uuidv4()}.${params.fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: params.fileType,
    ServerSideEncryption: "AES256", // Encryption at rest — HIPAA requirement
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: PRESIGNED_URL_EXPIRES,
  });

  return { uploadUrl, s3Key };
}

/**
 * Generate a short-lived presigned download URL.
 * Always generate fresh URLs — never cache or store these.
 */
export async function getDownloadPresignedUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  return getSignedUrl(s3, command, { expiresIn: PRESIGNED_URL_EXPIRES });
}

export async function deleteS3Object(s3Key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
}
