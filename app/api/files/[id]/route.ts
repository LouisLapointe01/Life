import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const supabase = createAdminClient();
    const { data: file, error } = await supabase
      .from("user_files")
      .select("storage_path, name, mime_type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !file)
      return NextResponse.json(
        { error: "Fichier introuvable" },
        { status: 404 }
      );

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.storage_path, 3600);

    if (urlError || !signedUrlData)
      return NextResponse.json(
        { error: "Impossible de générer l'URL" },
        { status: 500 }
      );

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      name: file.name,
      mime_type: file.mime_type,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.folder_id !== undefined) updates.folder_id = body.folder_id;
    if (body.category !== undefined) updates.category = body.category;

    if (Object.keys(updates).length === 0)
      return NextResponse.json(
        { error: "Aucune modification" },
        { status: 400 }
      );

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_files")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
