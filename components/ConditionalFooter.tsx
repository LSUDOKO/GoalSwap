"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";

export function ConditionalFooter() {
  const pathname = usePathname();

  // Hide the footer on internal application tabs (only show on landing page)
  if (pathname !== "/") {
    return null;
  }

  return <Footer />;
}
