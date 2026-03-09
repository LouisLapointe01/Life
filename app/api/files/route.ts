import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uploadFileMetaSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

function detectFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext))
    return "image";
  if (["doc", "docx", "odt", "txt", "rtf", "md"].includes(ext))
    return "document";
  return "other";
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folder_id"); // null = racine
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const supabase = createAdminClient();

    // Fichiers
    let filesQuery = supabase
      .from("user_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (folderId) {
      filesQuery = filesQuery.eq("folder_id", folderId);
    } else {
      filesQuery = filesQuery.is("folder_id", null);
    }

    if (category && category !== "Tous") {
      filesQuery = filesQuery.eq("category", category);
    }
    if (search) {
      filesQuery = filesQuery.ilike("name", `%${search}%`);
    }

    // Dossiers enfants
    let foldersQuery = supabase
      .from("user_folders")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (folderId) {
      foldersQuery = foldersQuery.eq("parent_id", folderId);
    } else {
      foldersQuery = foldersQuery.is("parent_id", null);
    }

    if (search) {
      foldersQuery = foldersQuery.ilike("name", `%${search}%`);
    }

    const [filesResult, foldersResult] = await Promise.all([
      filesQuery,
      foldersQuery,
    ]);

    if (filesResult.error)
      return NextResponse.json(
        { error: filesResult.error.message },
        { status: 500 }
      );
    if (foldersResult.error)
      return NextResponse.json(
        { error: foldersResult.error.message },
        { status: 500 }
      );

    return NextResponse.json({
      files: filesResult.data,
      folders: foldersResult.data,
    });
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return NextResponse.json(
        { error: "Fichier requis" },
        { status: 400 }
      );

    const meta = uploadFileMetaSchema.parse({
      folder_id: formData.get("folder_id") || null,
      category: formData.get("category") || "Autre",
    });

    const supabase = createAdminClient();
    const fileId = crypto.randomUUID();
    const storagePath = `${user.id}/${fileId}/${file.name}`;

    // Upload vers Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("user-files")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Insert métadonnées
    const { data, error: dbError } = await supabase
      .from("user_files")
      .insert({
        id: fileId,
        user_id: user.id,
        folder_id: meta.folder_id ?? null,
        name: file.name,
        file_type: detectFileType(file.name),
        mime_type: file.type || null,
        size_bytes: file.size,
        category: meta.category ?? "Autre",
        storage_path: storagePath,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: supprimer du storage
      await supabase.storage.from("user-files").remove([storagePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

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

    // Récupérer le fichier pour obtenir le storage_path
    const { data: file, error: fetchError } = await supabase
      .from("user_files")
      .select("storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !file)
      return NextResponse.json(
        { error: "Fichier introuvable" },
        { status: 404 }
      );

    // Supprimer du Storage puis de la table
    await supabase.storage.from("user-files").remove([file.storage_path]);

    const { error: deleteError } = await supabase
      .from("user_files")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError)
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
