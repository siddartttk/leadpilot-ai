"use client";
import { useEffect, useRef } from "react";
import { CircleNotch, ArrowRight, WarningCircle } from "@phosphor-icons/react";
export function Loading() {
  return (
    <div className="loading" role="status">
      <CircleNotch size={24} className="spin" />
      <span>Loading your workspace…</span>
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "New records will appear here.",
  children,
}: {
  title?: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <ArrowRight size={24} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div className="empty" role="alert">
      <WarningCircle size={30} />
      <h3>We couldn’t load this view</h3>
      <p>{error.message}</p>
      {retry && (
        <button className="button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={"badge badge-" + value.toLowerCase().replaceAll(" ", "-")}>
      <i />
      {value}
    </span>
  );
}
export function Score({ value }: { value: number }) {
  return (
    <span
      className={
        "score " + (value >= 75 ? "high" : value >= 45 ? "medium" : "low")
      }
    >
      <b>{value}</b>
      <span>/100</span>
    </span>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={onClose} aria-label={title}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SectionHead({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
