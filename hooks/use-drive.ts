"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { clientCache } from "@/lib/client-cache";
import type { UserFile, UserFolder } from "@/lib/types/files";

type DriveState = {
  /** Tous les fichiers du dossier courant (non filtrés) */
  rawFiles: UserFile[];
  /** Tous les sous-dossiers du dossier courant (non filtrés) */
  rawFolders: UserFolder[];
  /** Tous les dossiers de l'utilisateur (pour breadcrumb, MoveDialog) */
  allFolders: UserFolder[];
  loading: boolean;
  currentFolderId: string | null;
};

export function useDrive() {
  const [state, setState] = useState<DriveState>({
    rawFiles: [],
    rawFolders: [],
    allFolders: [],
    loading: true,
    currentFolderId: null,
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");
  const abortRef = useRef<AbortController | null>(null);

  // ─── Fetch : charge TOUT le dossier, sans filtre ───
  const fetchContent = useCallback(
    async (folderId: string | null) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams();
      if (folderId) params.set("folder_id", folderId);
      // Pas de category ni search → on récupère tout

      const cacheKey = `drive:folder:${folderId ?? "root"}`;
      const cached = clientCache.get<{ files: UserFile[]; folders: UserFolder[] }>(cacheKey);

      if (cached) {
        setState((s) => ({
          ...s,
          rawFiles: cached.files,
          rawFolders: cached.folders,
          loading: false,
          currentFolderId: folderId,
        }));
      } else {
        setState((s) => ({ ...s, loading: true, currentFolderId: folderId }));
      }

      try {
        const res = await fetch(`/api/files?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Erreur chargement");
        const data = await res.json();
        clientCache.set(cacheKey, data);
        setState((s) => ({
          ...s,
          rawFiles: data.files,
          rawFolders: data.folders,
          loading: false,
        }));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState((s) => ({ ...s, loading: false }));
        }
      }
    },
    []
  );

  const fetchAllFolders = useCallback(async () => {
    const cached = clientCache.get<UserFolder[]>("drive:allFolders");
    if (cached) {
      setState((s) => ({ ...s, allFolders: cached }));
    }
    try {
      const res = await fetch("/api/folders");
      if (!res.ok) return;
      const data = await res.json();
      clientCache.set("drive:allFolders", data);
      setState((s) => ({ ...s, allFolders: data }));
    } catch {
      // ignore
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    fetchContent(null);
    fetchAllFolders();
  }, [fetchContent, fetchAllFolders]);

  // ─── Filtrage 100% client (instantané) ───
  const searchLower = search.toLowerCase();

  const files = useMemo(() => {
    let result = state.rawFiles;
    if (category !== "Tous") {
      result = result.filter((f) => f.category === category);
    }
    if (searchLower) {
      result = result.filter((f) => f.name.toLowerCase().includes(searchLower));
    }
    return result;
  }, [state.rawFiles, category, searchLower]);

  const folders = useMemo(() => {
    if (!searchLower) return state.rawFolders;
    return state.rawFolders.filter((f) =>
      f.name.toLowerCase().includes(searchLower)
    );
  }, [state.rawFolders, searchLower]);

  // ─── Navigation ───
  const navigateToFolder = useCallback(
    (folderId: string | null) => {
      setSearch("");
      setCategory("Tous");
      fetchContent(folderId);
    },
    [fetchContent]
  );

  const refresh = useCallback(() => {
    fetchContent(state.currentFolderId);
    fetchAllFolders();
  }, [fetchContent, fetchAllFolders, state.currentFolderId]);

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    const path: UserFolder[] = [];
    let id = state.currentFolderId;
    while (id) {
      const folder = state.allFolders.find((f) => f.id === id);
      if (!folder) break;
      path.unshift(folder);
      id = folder.parent_id;
    }
    return path;
  }, [state.currentFolderId, state.allFolders]);

  // === CRUD Operations ===

  const uploadFile = useCallback(
    async (file: File, folderId: string | null, uploadCategory: string) => {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) formData.append("folder_id", folderId);
      formData.append("category", uploadCategory);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur upload");
      }
      return (await res.json()) as UserFile;
    },
    []
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      const res = await fetch(`/api/files?id=${fileId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur suppression");
      }
      setState((s) => ({
        ...s,
        rawFiles: s.rawFiles.filter((f) => f.id !== fileId),
      }));
    },
    []
  );

  const renameFile = useCallback(async (fileId: string, name: string) => {
    const res = await fetch(`/api/files/${fileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erreur renommage");
    }
    const updated = (await res.json()) as UserFile;
    setState((s) => ({
      ...s,
      rawFiles: s.rawFiles.map((f) => (f.id === fileId ? updated : f)),
    }));
    return updated;
  }, []);

  const moveFile = useCallback(
    async (fileId: string, folderId: string | null) => {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur déplacement");
      }
      setState((s) => ({
        ...s,
        rawFiles: s.rawFiles.filter((f) => f.id !== fileId),
      }));
    },
    []
  );

  const getSignedUrl = useCallback(async (fileId: string) => {
    const res = await fetch(`/api/files/${fileId}`);
    if (!res.ok) throw new Error("Impossible d'obtenir l'URL");
    return (await res.json()) as { url: string; name: string; mime_type: string };
  }, []);

  const createFolder = useCallback(
    async (name: string, parentId: string | null, color: string) => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parent_id: parentId, color }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur création dossier");
      }
      const created = (await res.json()) as UserFolder;
      setState((s) => ({
        ...s,
        rawFolders: [...s.rawFolders, created],
        allFolders: [...s.allFolders, created],
      }));
      return created;
    },
    []
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      const res = await fetch(`/api/folders?id=${folderId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur suppression dossier");
      }
      const allIds = new Set<string>();
      const collect = (id: string) => {
        allIds.add(id);
        state.allFolders
          .filter((f) => f.parent_id === id)
          .forEach((f) => collect(f.id));
      };
      collect(folderId);

      setState((s) => ({
        ...s,
        rawFolders: s.rawFolders.filter((f) => !allIds.has(f.id)),
        allFolders: s.allFolders.filter((f) => !allIds.has(f.id)),
        rawFiles: s.rawFiles.filter((f) => !f.folder_id || !allIds.has(f.folder_id)),
      }));
    },
    [state.allFolders]
  );

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur renommage dossier");
      }
      const updated = (await res.json()) as UserFolder;
      setState((s) => ({
        ...s,
        rawFolders: s.rawFolders.map((f) => (f.id === folderId ? updated : f)),
        allFolders: s.allFolders.map((f) => (f.id === folderId ? updated : f)),
      }));
      return updated;
    },
    []
  );

  const moveFolder = useCallback(
    async (folderId: string, parentId: string | null) => {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: parentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur déplacement dossier");
      }
      setState((s) => ({
        ...s,
        rawFolders: s.rawFolders.filter((f) => f.id !== folderId),
      }));
      fetchAllFolders();
    },
    [fetchAllFolders]
  );

  return {
    files,
    folders,
    allFolders: state.allFolders,
    loading: state.loading,
    currentFolderId: state.currentFolderId,
    search,
    setSearch,
    category,
    setCategory,
    breadcrumb,
    navigateToFolder,
    refresh,
    uploadFile,
    deleteFile,
    renameFile,
    moveFile,
    getSignedUrl,
    createFolder,
    deleteFolder,
    renameFolder,
    moveFolder,
  };
}
