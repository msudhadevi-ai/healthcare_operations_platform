import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, getSessionCookieOptions } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password format" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        clinicId: true,
        email: true,
        passwordHash: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    // Generic error — do not reveal whether email exists (HIPAA/security best practice)
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      clinicId: user.clinicId,
      role: user.role,
      email: user.email,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const meta = getRequestMeta(request);
    await writeAuditLog({
      clinicId: user.clinicId,
      userId: user.id,
      action: "LOGIN",
      resource: "User",
      resourceId: user.id,
      ...meta,
    });

    // Use next/headers cookies() — reliable in Next.js 15 Route Handlers
    const { name, ...options } = getSessionCookieOptions();
    const cookieStore = await cookies();
    cookieStore.set(name, token, options);

    return NextResponse.json({
      success: true,
      data: { name: user.name, role: user.role, clinicId: user.clinicId },
    });
  } catch (error) {
    console.error("[LOGIN]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
