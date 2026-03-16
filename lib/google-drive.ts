/**
 * Google Drive API — Client complet
 * Utilisé par /api/google/drive pour proxifier les appels Drive côté serveur.
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

const FILE_FIELDS =
  "id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,parents,createdTime,modifiedTime,iconLink,starred,trashed,capabilities(canEdit,canDelete,canRename,canMoveItemWithinDrive)";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
  iconLink?: string;
  starred?: boolean;
  trashed?: boolean;
  capabilities?: {
    canEdit?: boolean;
    canDelete?: boolean;
    canRename?: boolean;
    canMoveItemWithinDrive?: boolean;
  };
};

export type DriveStorageQuota = {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
};

class DriveApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function driveFetch(accessToken: string, path: string, options?: RequestInit) {
  const res = await fetch(`${DRIVE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new DriveApiError(res.status, `Drive API ${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ═══════════════════════════════════════════════════════
   Lister / Rechercher
   ═══════════════════════════════════════════════════════ */

export async function listDriveFiles(
  accessToken: string,
  opts: { folderId?: string | null; pageToken?: string; pageSize?: number } = {}
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const q = opts.folderId
    ? `'${opts.folderId}' in parents and trashed=false`
    : `'root' in parents and trashed=false`;

  const params = new URLSearchParams({
    q,
    fields: `nextPageToken, files(${FILE_FIELDS})`,
    pageSize: String(opts.pageSize ?? 100),
    orderBy: "folder,name",
  });
  if (opts.pageToken) params.set("pageToken", opts.pageToken);

  return driveFetch(accessToken, `/files?${params}`);
}

export async function searchDriveFiles(
  accessToken: string,
  query: string,
  opts: { pageSize?: number } = {}
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const q = `name contains '${query.replace(/'/g, "\\'")}' and trashed=false`;
  const params = new URLSearchParams({
    q,
    fields: `nextPageToken, files(${FILE_FIELDS})`,
    pageSize: String(opts.pageSize ?? 50),
    orderBy: "relevance",
  });
  return driveFetch(accessToken, `/files?${params}`);
}

/* ═══════════════════════════════════════════════════════
   Créer
   ═══════════════════════════════════════════════════════ */

export async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string | null
): Promise<DriveFile> {
  const body: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) body.parents = [parentId];
  return driveFetch(accessToken, `/files?fields=${FILE_FIELDS}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Upload multipart vers Google Drive */
export async function uploadDriveFile(
  accessToken: string,
  fileBlob: Blob,
  fileName: string,
  parentId?: string | null
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = { name: fileName };
  if (parentId) metadata.parents = [parentId];

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", fileBlob, fileName);

  const res = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=${FILE_FIELDS}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new DriveApiError(res.status, `Drive upload ${res.status}: ${err}`);
  }
  return res.json();
}

/* ═══════════════════════════════════════════════════════
   Modifier
   ═══════════════════════════════════════════════════════ */

export async function renameDriveFile(
  accessToken: string,
  fileId: string,
  newName: string
): Promise<DriveFile> {
  return driveFetch(accessToken, `/files/${fileId}?fields=${FILE_FIELDS}`, {
    method: "PATCH",
    body: JSON.stringify({ name: newName }),
  });
}

export async function moveDriveFile(
  accessToken: string,
  fileId: string,
  newParentId: string,
  oldParentId: string
): Promise<DriveFile> {
  return driveFetch(
    accessToken,
    `/files/${fileId}?addParents=${newParentId}&removeParents=${oldParentId}&fields=${FILE_FIELDS}`,
    { method: "PATCH", body: JSON.stringify({}) }
  );
}

export async function starDriveFile(
  accessToken: string,
  fileId: string,
  starred: boolean
): Promise<DriveFile> {
  return driveFetch(accessToken, `/files/${fileId}?fields=${FILE_FIELDS}`, {
    method: "PATCH",
    body: JSON.stringify({ starred }),
  });
}

export async function copyDriveFile(
  accessToken: string,
  fileId: string,
  name: string,
  parentId?: string | null
): Promise<DriveFile> {
  const body: Record<string, unknown> = { name };
  if (parentId) body.parents = [parentId];
  return driveFetch(accessToken, `/files/${fileId}/copy?fields=${FILE_FIELDS}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ═══════════════════════════════════════════════════════
   Supprimer
   ═══════════════════════════════════════════════════════ */

/** Déplace dans la corbeille */
export async function trashDriveFile(
  accessToken: string,
  fileId: string
): Promise<DriveFile> {
  return driveFetch(accessToken, `/files/${fileId}?fields=id,trashed`, {
    method: "PATCH",
    body: JSON.stringify({ trashed: true }),
  });
}

/** Suppression permanente */
export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<null> {
  return driveFetch(accessToken, `/files/${fileId}`, { method: "DELETE" });
}

/* ═══════════════════════════════════════════════════════
   Quota de stockage
   ═══════════════════════════════════════════════════════ */

export async function getDriveStorageQuota(
  accessToken: string
): Promise<DriveStorageQuota> {
  const res = await driveFetch(
    accessToken,
    "/about?fields=storageQuota"
  );
  return res?.storageQuota ?? {};
}

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */

export function isGoogleDoc(mimeType: string): boolean {
  return mimeType.startsWith("application/vnd.google-apps.");
}

export function isFolder(mimeType: string): boolean {
  return mimeType === "application/vnd.google-apps.folder";
}

export function driveFileCategory(
  mimeType: string
): "folder" | "image" | "video" | "audio" | "pdf" | "doc" | "sheet" | "slide" | "other" {
  if (isFolder(mimeType)) return "folder";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("document") || mimeType.includes("word")) return "doc";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "sheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "slide";
  return "other";
}
