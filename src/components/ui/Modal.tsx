import type { FormEventHandler, MouseEvent, ReactNode } from "react";

type ModalProps = {
  as?: "section" | "form";
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

export function Modal({
  as = "section",
  children,
  className,
  labelledBy,
  onClose,
  onSubmit
}: ModalProps) {
  const modalClassName = ["modal", className].filter(Boolean).join(" ");

  function stopPropagation(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      {as === "form" ? (
        <form
          className={modalClassName}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onClick={stopPropagation}
          onSubmit={onSubmit}
        >
          {children}
        </form>
      ) : (
        <section
          className={modalClassName}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onClick={stopPropagation}
        >
          {children}
        </section>
      )}
    </div>
  );
}

type ModalActionsProps = {
  cancelDisabled?: boolean;
  cancelLabel?: ReactNode;
  className?: string;
  onCancel: () => void;
  onPrimary?: () => void;
  primaryClassName?: string;
  primaryDisabled?: boolean;
  primaryIcon?: ReactNode;
  primaryLabel?: ReactNode;
  primaryType?: "button" | "submit";
};

export function ModalActions({
  cancelDisabled = false,
  cancelLabel = "Cancel",
  className,
  onCancel,
  onPrimary,
  primaryClassName,
  primaryDisabled = false,
  primaryIcon,
  primaryLabel,
  primaryType = "button"
}: ModalActionsProps) {
  const actionsClassName = ["folder-modal-actions", className].filter(Boolean).join(" ");
  const primaryButtonClassName = ["primary-button", primaryClassName].filter(Boolean).join(" ");

  return (
    <div className={actionsClassName}>
      {primaryLabel ? (
        <button
          className={primaryButtonClassName}
          type={primaryType}
          disabled={primaryDisabled}
          onClick={onPrimary}
        >
          {primaryIcon}
          {primaryLabel}
        </button>
      ) : null}
      <button
        className="text-button"
        type="button"
        disabled={cancelDisabled}
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
