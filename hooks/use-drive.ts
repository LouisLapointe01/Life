"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { clientCache } from "@/lib/client-cache";
import type { UserFile, UserFolder } from "@/lib/types/files";

type DriveState = {
  files: UserFile[];
  folders: UserFolder[];
  allFolders: UserFolder[];
  loading: boolean;
  currentFolderId: string | null;
};

export function useDrive() {
  const [state, setState] = useState<DriveState>({
    files: [],
    folders: [],
    allFolders: [],
    loading: true,
    currentFolderId: null,
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");
  const abortRef = useRef<AbortController | null>(null);

  const fetchContent = useCallback(
    async (folderId: string | null, opts?: { search?: string; category?: string }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams();
      if (folderId) params.set("folder_id", folderId);
      if (opts?.search) params.set("search", opts.search);
      if (opts?.category && opts.category !== "Tous")
        params.set("category", opts.category);

      const cacheKey = `drive:${folderId ?? "root"}:${opts?.search ?? ""}:${opts?.category ?? ""}`;
      const cached = clientCache.get<{ files: UserFile[]; folders: UserFolder[] }>(cacheKey);

      if (cached) {
        setState((s) => ({
          ...s,
          files: cached.files,
          folders: cached.folders,
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
          files: data.files,
          folders: data.folders,
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

  const navigateToFolder = useCallback(
    (folderId: string | null) => {
      setSearch("");
      setCategory("Tous");
      fetchContent(folderId);
    },
    [fetchContent]
  );

  const refresh = useCallback(() => {
    fetchContent(state.currentFolderId, { search, category });
    fetchAllFolders();
  }, [fetchContent, fetchAllFolders, state.currentFolderId, search, category]);

  // Re-fetch quand search/category changent (avec debounce léger)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchContent(state.currentFolderId, { search, category });
    }, 200);
    return () => clearTimeout(searchTimerRef.current);
  }, [search, category, state.currentFolderId, fetchContent]);

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

  // Compte récursif des fichiers dans un dossier (basé sur allFolders)
  const folderFileCount = useCallback(
    (folderId: string, allFiles?: UserFile[]): number => {
      // On ne peut pas compter précisément sans avoir tous les fichiers
      // Retourne 0 par défaut — la page affichera le compte local
      return 0;
    },
    []
  );

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
        files: s.files.filter((f) => f.id !== fileId),
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
      files: s.files.map((f) => (f.id === fileId ? updated : f)),
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
      // Retirer le fichier de la vue courante (il a changé de dossier)
      setState((s) => ({
        ...s,
        files: s.files.filter((f) => f.id !== fileId),
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
        folders: [...s.folders, created],
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
      // Retirer le dossier et ses enfants de l'état
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
        folders: s.folders.filter((f) => !allIds.has(f.id)),
        allFolders: s.allFolders.filter((f) => !allIds.has(f.id)),
        files: s.files.filter((f) => !f.folder_id || !allIds.has(f.folder_id)),
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
        folders: s.folders.map((f) => (f.id === folderId ? updated : f)),
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
      // Retirer le dossier de la vue courante
      setState((s) => ({
        ...s,
        folders: s.folders.filter((f) => f.id !== folderId),
      }));
      // Refresh allFolders
      fetchAllFolders();
    },
    [fetchAllFolders]
  );

  return {
    files: state.files,
    folders: state.folders,
    allFolders: state.allFolders,
    loading: state.loading,
    currentFolderId: state.currentFolderId,
    search,
    setSearch,
    category,
    setCategory,
    breadcrumb,
    folderFileCount,
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
