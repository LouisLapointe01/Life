import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { updateFolderSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

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
    const parsed = updateFolderSchema.parse(body);

    const updates: Record<string, unknown> = {};
    if (parsed.name !== undefined) updates.name = parsed.name;
    if (parsed.color !== undefined) updates.color = parsed.color;
    if (parsed.parent_id !== undefined) updates.parent_id = parsed.parent_id;

    if (Object.keys(updates).length === 0)
      return NextResponse.json(
        { error: "Aucune modification" },
        { status: 400 }
      );

    // Anti-circularité : un dossier ne peut pas être déplacé dans lui-même ou ses descendants
    if (parsed.parent_id !== undefined && parsed.parent_id !== null) {
      const supabase = createAdminClient();
      const { data: allFolders } = await supabase
        .from("user_folders")
        .select("id, parent_id")
        .eq("user_id", user.id);

      if (allFolders) {
        const descendants = new Set<string>();
        const collectDescendants = (parentId: string) => {
          descendants.add(parentId);
          allFolders
            .filter((f) => f.parent_id === parentId)
            .forEach((f) => collectDescendants(f.id));
        };
        collectDescendants(id);

        if (descendants.has(parsed.parent_id)) {
          return NextResponse.json(
            {
              error:
                "Impossible de déplacer un dossier dans lui-même ou ses descendants",
            },
            { status: 400 }
          );
        }
      }
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_folders")
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
