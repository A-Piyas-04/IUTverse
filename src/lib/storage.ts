// localStorage that never throws and never runs on the server. Pages render on
// the server too, where there is no storage, and browsers can also block it.
export const readStored = (key: string): string | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStored = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch { /* The value simply is not remembered. */ }
};

export const removeStored = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch { /* Nothing to remove. */ }
};
