import { createEmptyState, sanitizeState, type GlobalState } from "../model/env";

const STORAGE_KEY = "browserGroupEnvState";

export async function loadState(): Promise<GlobalState> {
  if (!hasChromeStorage()) {
    return loadPreviewState();
  }
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const state = result[STORAGE_KEY] as GlobalState | undefined;
  if (state) {
    const sanitized = sanitizeState(state);
    if (needsMigration(state)) {
      await saveState(sanitized);
    }
    return sanitized;
  }
  const initial = createEmptyState();
  await saveState(initial);
  return initial;
}

export async function saveState(state: GlobalState): Promise<void> {
  if (!hasChromeStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export function onStateChanged(callback: () => void): () => void {
  if (!hasChromeStorage()) {
    return () => {};
  }
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      callback();
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

function loadPreviewState(): GlobalState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as GlobalState;
      const sanitized = sanitizeState(parsed);
      if (needsMigration(parsed)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  const initial = createEmptyState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function needsMigration(state: GlobalState): boolean {
  return !("templates" in state);
}
