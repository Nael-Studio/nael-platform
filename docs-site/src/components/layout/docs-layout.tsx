"use client";

import { usePathname } from "next/navigation";
import { DocsSidebar, DocsSidebarMobile } from "@/components/layout/docs-sidebar";
import { DocsRightRail } from "@/components/layout/docs-right-rail";

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isDocsPage = pathname.startsWith("/docs");

  if (isHomePage) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="min-w-0 space-y-16">{children}</div>
      </div>
    );
  }

  if (isDocsPage) {
    return (
      <>
        <DocsSidebarMobile />
        <div className="grid w-full gap-10 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)360px]">
          <DocsSidebar />
          <div className="min-w-0 space-y-16">{children}</div>
          <DocsRightRail />
        </div>
      </>
    );
  }

  return <div className="min-w-0 space-y-16">{children}</div>;
}
