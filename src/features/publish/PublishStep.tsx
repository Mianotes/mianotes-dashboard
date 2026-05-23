import type { ReactNode } from "react";

type PublishStepProps = {
  children: ReactNode;
  description: string;
  number: number;
  className?: string;
};

export function PublishStep({ children, description, number, className }: PublishStepProps) {
  const classNames = ["publish-step", className].filter(Boolean).join(" ");

  return (
    <section className={classNames}>
      <div className="publish-step-marker" aria-hidden="true">
        <span>{number}</span>
      </div>
      <div className="publish-step-body">
        <p className="publish-step-description">{description}</p>
        {children}
      </div>
    </section>
  );
}
