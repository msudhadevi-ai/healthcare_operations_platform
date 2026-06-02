import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  const clinicId = request.headers.get("x-clinic-id");

  if (!userId || !clinicId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, email: true, clinicId: true },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}
