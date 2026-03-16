import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken } from "@/lib/google-calendar";
import {
  listDriveFiles, searchDriveFiles,
  createDriveFolder, uploadDriveFile,
  renameDriveFile, moveDriveFile, trashDriveFile, starDriveFile, copyDriveFile,
  getDriveStorageQuota,
} from "@/lib/google-drive";

async function getAuthUser() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

/* ═══════════════════════════════════════════════════════
   GET — list / search / quota
   ?tokenId=X [&folderId=Y] [&q=search] [&action=quota]
   ═══════════════════════════════════════════════════════ */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");
    const action = searchParams.get("action");
    const folderId = searchParams.get("folderId") || null;
    const q = searchParams.get("q") || "";

    if (!tokenId) return NextResponse.json({ error: "tokenId requis" }, { status: 400 });

    const accessToken = await getValidAccessToken(user.id, tokenId);
    if (!accessToken) return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 403 });

    if (action === "quota") {
      const quota = await getDriveStorageQuota(accessToken);
      return NextResponse.json({ quota });
    }

    if (q) {
      const result = await searchDriveFiles(accessToken, q);
      return NextResponse.json(result);
    }

    const result = await listDriveFiles(accessToken, { folderId });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 403 || status === 401) {
      return NextResponse.json({ error: "drive_permission_denied" }, { status: 403 });
    }
    console.error("[GET /api/google/drive]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   POST — créer dossier ou uploader fichier
   ?tokenId=X&action=createFolder|upload
   ═══════════════════════════════════════════════════════ */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");
    const action = searchParams.get("action");

    if (!tokenId) return NextResponse.json({ error: "tokenId requis" }, { status: 400 });

    const accessToken = await getValidAccessToken(user.id, tokenId);
    if (!accessToken) return NextResponse.json({ error: "Token invalide" }, { status: 403 });

    if (action === "createFolder") {
      const body = await request.json();
      const folder = await createDriveFolder(accessToken, body.name, body.parentId || null);
      return NextResponse.json(folder);
    }

    if (action === "upload") {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const parentId = formData.get("parentId") as string | null;
      if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
      const uploaded = await uploadDriveFile(accessToken, file, file.name, parentId);
      return NextResponse.json(uploaded);
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[POST /api/google/drive]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   PATCH — renommer / déplacer / étoiler / copier
   ?tokenId=X&action=rename|move|star|copy&fileId=Y
   ═══════════════════════════════════════════════════════ */
export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");
    const action = searchParams.get("action");
    const fileId = searchParams.get("fileId");

    if (!tokenId || !fileId) return NextResponse.json({ error: "Params manquants" }, { status: 400 });

    const accessToken = await getValidAccessToken(user.id, tokenId);
    if (!accessToken) return NextResponse.json({ error: "Token invalide" }, { status: 403 });

    const body = await request.json();

    if (action === "rename") {
      const updated = await renameDriveFile(accessToken, fileId, body.name);
      return NextResponse.json(updated);
    }
    if (action === "move") {
      const updated = await moveDriveFile(accessToken, fileId, body.newParentId, body.oldParentId);
      return NextResponse.json(updated);
    }
    if (action === "star") {
      const updated = await starDriveFile(accessToken, fileId, body.starred);
      return NextResponse.json(updated);
    }
    if (action === "copy") {
      const copied = await copyDriveFile(accessToken, fileId, body.name, body.parentId);
      return NextResponse.json(copied);
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/google/drive]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   DELETE — mettre à la corbeille
   ?tokenId=X&fileId=Y
   ═══════════════════════════════════════════════════════ */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");
    const fileId = searchParams.get("fileId");

    if (!tokenId || !fileId) return NextResponse.json({ error: "Params manquants" }, { status: 400 });

    const accessToken = await getValidAccessToken(user.id, tokenId);
    if (!accessToken) return NextResponse.json({ error: "Token invalide" }, { status: 403 });

    await trashDriveFile(accessToken, fileId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/google/drive]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
