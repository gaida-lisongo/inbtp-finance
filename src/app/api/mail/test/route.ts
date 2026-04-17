import { NextResponse } from "next/server";

import { mailService } from "@/utils/mail";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipient = searchParams.get("to")?.trim() ?? "";

  try {
    const transport = await mailService.test();
    const result = await mailService.sendTestMail(recipient);

    return NextResponse.json({
      ok: true,
      transport,
      result,
    });
  } catch (error) {
    console.error("Mail test failed", error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Mail test failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { to?: string };
    const transport = await mailService.test();
    const result = await mailService.sendTestMail(payload.to);

    return NextResponse.json({
      ok: true,
      transport,
      result,
    });
  } catch (error) {
    console.error("Mail test failed", error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Mail test failed",
      },
      { status: 500 },
    );
  }
}
