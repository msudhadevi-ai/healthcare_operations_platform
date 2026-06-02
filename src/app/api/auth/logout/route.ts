import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

  const cookieStore = await cookies();
  cookieStore.delete("apthal_session");

  return NextResponse.json({ success: true });
}
