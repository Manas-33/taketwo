"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const NAV_ITEMS = [
  { label: "Script", href: "/script" },
  { label: "Assets", href: "/assets" },
  { label: "Scenes", href: "/scenes" },
  { label: "Continuity", href: "/continuity" },
  { label: "Export", href: "/export" },
];

export default function Navbar() {
  const pathname = usePathname();

  const editorAsScenes = pathname.startsWith("/editor");
  const effectivePath = editorAsScenes ? "/scenes" : pathname;

  const activeIndex = NAV_ITEMS.findIndex(
    (item) =>
      effectivePath === item.href || effectivePath.startsWith(item.href + "/"),
  );

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-center px-8 py-4">
      <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-sm border border-stone-200/60">
        {NAV_ITEMS.map((item, index) => {
          const isActive = index === activeIndex;
          const isVisited = index < activeIndex;

          return (
            <div key={item.href} className="flex items-center">
              <Link
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-orange-600 text-white shadow-sm"
                    : isVisited
                      ? "text-stone-700 hover:bg-stone-100"
                      : "text-stone-300 hover:text-stone-400 hover:bg-stone-50"
                }`}
              >
                {item.label}
              </Link>
              {index < NAV_ITEMS.length - 1 && (
                <ChevronRight
                  size={14}
                  className={`mx-0.5 shrink-0 ${
                    index < activeIndex ? "text-stone-400" : "text-stone-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
