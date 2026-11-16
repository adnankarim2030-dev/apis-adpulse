import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { isR2Configured, createPresignedUpload } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    requireSession(await getSession());

    const body = await request.json();
    const { fileName, contentType, fileSize } = body;

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    if (!isR2Configured()) {
      return NextResponse.json({
        configured: false,
        message: "Cloudflare R2 is ready in the codebase! To activate live uploads, please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in Vercel / .env.",
      });
    }

    const presigned = await createPresignedUpload(fileName, contentType);
    if (!presigned) {
      return NextResponse.json({ error: "Failed to generate presigned upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      configured: true,
      uploadUrl: presigned.uploadUrl,
      downloadUrl: presigned.downloadUrl,
      key: presigned.key,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
