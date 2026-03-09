import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createFolderSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_folders")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const parsed = createFolderSchema.parse(body);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_folders")
      .insert({
        user_id: user.id,
        name: parsed.name,
        parent_id: parsed.parent_id ?? null,
        color: parsed.color ?? "#3B82F6",
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const supabase = createAdminClient();

    // Collecter récursivement tous les IDs de sous-dossiers
    const allFolderIds: string[] = [id];
    const collectChildren = async (parentIds: string[]) => {
      const { data } = await supabase
        .from("user_folders")
        .select("id")
        .eq("user_id", user.id)
        .in("parent_id", parentIds);
      if (data && data.length > 0) {
        const childIds = data.map((f) => f.id);
        allFolderIds.push(...childIds);
        await collectChildren(childIds);
      }
    };
    await collectChildren([id]);

    // Récupérer tous les fichiers dans ces dossiers pour supprimer du storage
    const { data: filesToDelete } = await supabase
      .from("user_files")
      .select("storage_path")
      .eq("user_id", user.id)
      .in("folder_id", allFolderIds);

    if (filesToDelete && filesToDelete.length > 0) {
      const paths = filesToDelete.map((f) => f.storage_path);
      await supabase.storage.from("user-files").remove(paths);
    }

    // Supprimer les fichiers de la table
    await supabase
      .from("user_files")
      .delete()
      .eq("user_id", user.id)
      .in("folder_id", allFolderIds);

    // Supprimer les dossiers (enfants d'abord grâce au CASCADE, mais on nettoie explicitement)
    // On supprime le parent — le CASCADE supprime les enfants
    const { error } = await supabase
      .from("user_folders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
