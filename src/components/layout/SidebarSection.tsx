import type { ReactNode } from "react";

type SidebarSectionProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SidebarSection({ title, action, children }: SidebarSectionProps) {
  return (
    <section className="sidebar-section">
      <div className="section-title">
        <span>{title}</span>
        {action}
      </div>
      <div className="nav-group sidebar-section-body">{children}</div>
    </section>
  );
}
