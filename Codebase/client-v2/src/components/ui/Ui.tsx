import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Inbox, X } from "lucide-react";
import styles from "./Ui.module.css";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; iconOnly?: boolean }>(function Button({ variant = "primary", iconOnly, className = "", ...props }, ref) {
  return <button ref={ref} type={props.type ?? "button"} className={`${styles.button} ${styles[variant]} ${iconOnly ? styles.icon : ""} ${className}`} {...props} />;
});
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <label className={styles.field}><span>{label}</span>{children}{error && <span className={styles.error}>{error}</span>}</label>; }
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = "", ...props }, ref) {
  return <input ref={ref} className={`${styles.input} ${className}`} {...props} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = "", ...props }, ref) {
  return <textarea ref={ref} className={`${styles.textarea} ${className}`} {...props} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = "", ...props }, ref) {
  return <select ref={ref} className={`${styles.select} ${className}`} {...props} />;
});
export function Card({ children, padded = false, className = "" }: { children: ReactNode; padded?: boolean; className?: string }) { return <section className={`${styles.card} ${padded ? styles.cardPad : ""} ${className}`}>{children}</section>; }
export function Chip({ active, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) { return <button type="button" className={`${styles.chip} ${active ? styles.chipActive : ""}`} aria-pressed={active} {...props} />; }
export function Avatar({ name, src, size = 42 }: { name?: string; src?: string; size?: number }) { const initials = (name || "IUT").split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase(); return <span className={styles.avatar} style={{ width: size, height: size }}>{src ? <img src={src} alt="" /> : initials}</span>; }
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) { return <div className={styles.empty}><div><Inbox size={34} aria-hidden="true" /><h3>{title}</h3><p>{body}</p>{action}</div></div>; }
export function Skeleton({ height = 18 }: { height?: number }) { return <div className={styles.skeleton} style={{ height }} aria-hidden="true" />; }

interface ToastContextValue { notify(message: string): void; }
const ToastContext = createContext<ToastContextValue>({ notify() {} });
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const notify = useCallback((message: string) => { const id = Date.now(); setToasts(v => [...v, { id, message }]); window.setTimeout(() => setToasts(v => v.filter(t => t.id !== id)), 3500); }, []);
  return <ToastContext.Provider value={{ notify }}>{children}<div className={styles.toastRegion} aria-live="polite">{toasts.map(t => <div className={styles.toast} key={t.id}>{t.message}</div>)}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);

export function Dialog({ title, open, onClose, children }: { title: string; open: boolean; onClose(): void; children: ReactNode }) {
  const heading = useId(); const closeRef = useRef<HTMLButtonElement>(null); const previous = useRef<HTMLElement | null>(null);
  useEffect(() => { if (!open) return; previous.current = document.activeElement as HTMLElement; closeRef.current?.focus(); const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "Tab") { const dialog = closeRef.current?.closest('[role="dialog"]'); const focusable = [...(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])]; if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } }; document.addEventListener("keydown", key); return () => { document.removeEventListener("keydown", key); previous.current?.focus(); }; }, [onClose, open]);
  if (!open) return null;
  return <div className={styles.dialogBackdrop} role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={heading}><header className={styles.dialogHeader}><h2 id={heading}>{title}</h2><Button ref={closeRef} variant="ghost" iconOnly aria-label="Close" onClick={onClose}><X /></Button></header><div className={styles.dialogBody}>{children}</div></div></div>;
}
export function DialogActions({ children }: { children: ReactNode }) { return <div className={styles.dialogActions}>{children}</div>; }
