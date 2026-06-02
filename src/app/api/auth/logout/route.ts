import { NextResponse } from "next/server";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function POST(request: Request) {
  const clinicId = request.headers.get("x-clinic-id");
  const userId = request.headers.get("x-user-id");

  if (clinicId && userId) {
    const meta = getRequestMeta(request);
    await writeAuditLog({
      clinicId,
      userId,
      action: "LOGOUT",
      resource: "User",
      resourceId: userId,
      ...meta,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("apthal_session");
  return response;
}
