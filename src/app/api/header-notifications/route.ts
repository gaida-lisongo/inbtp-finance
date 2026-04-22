import { NextResponse } from "next/server";

import { getNotificationsGestionnaire, getNotificationsOrganisateur, updateNotification, deleteNotification } from "@/lib/utils/supabase/admin-notifications";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user || user.activePersona !== "admin") {
      return NextResponse.json([]);
    }

    if (user.role === "gestionnaire") {
      return NextResponse.json(await getNotificationsGestionnaire());
    }

    if (user.role === "organisateur") {
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
