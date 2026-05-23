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
