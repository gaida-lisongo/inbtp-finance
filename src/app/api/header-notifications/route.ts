import { NextResponse } from "next/server";

import { getNotificationsGestionnaire, getNotificationsOrganisateur, updateNotification, deleteNotification } from "@/lib/utils/supabase/admin-notifications";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accountType = url.searchParams.get("accountType");

    if (!accountType) {
      return NextResponse.json([]);
    }

    if (accountType === "gestionnaire") {
      return NextResponse.json(await getNotificationsGestionnaire());
    }

    if (accountType === "organisateur") {
      return NextResponse.json(await getNotificationsOrganisateur());
    }

    return NextResponse.json([]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "header_notifications_failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request){
  try{
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID est requis." }, { status: 400 });
    }

    const { schema, key, value } = await request.json();

    const res = await updateNotification(schema, id, {key, value});

    return NextResponse.json(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "header_notifications_failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const schema = url.searchParams.get("schema");

    if (!id || !schema) {
      return NextResponse.json({ error: "ID and schema are required." }, { status: 400 });
    }

    const res = await deleteNotification(schema, id);

    return NextResponse.json(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "header_notifications_failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
