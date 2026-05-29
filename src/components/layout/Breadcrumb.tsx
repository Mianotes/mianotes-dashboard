import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type BreadcrumbItem = {
  key?: string;
  label: string;
  icon?: ReactNode;
  leading?: ReactNode;
  current?: boolean;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
  children?: ReactNode;
};

export function Breadcrumb({ items, className, children }: BreadcrumbProps) {
  const classNames = ["breadcrumb", className].filter(Boolean).join(" ");

  return (
    <div className={classNames}>
      {items.map((item, index) => (
        <span
          key={item.key ?? `${item.label}-${index}`}
          className={["breadcrumb-item", item.current ? "current" : undefined].filter(Boolean).join(" ")}
        >
          {index > 0 ? (
            <i className="breadcrumb-separator" aria-hidden="true">
              <ChevronRight size={14} />
            </i>
          ) : null}
          {item.leading ? <i className="breadcrumb-leading">{item.leading}</i> : null}
          {item.icon ? <i className="breadcrumb-icon" aria-hidden="true">{item.icon}</i> : null}
          <span className="breadcrumb-label">{item.label}</span>
        </span>
      ))}
      {children}
    </div>
  );
}
