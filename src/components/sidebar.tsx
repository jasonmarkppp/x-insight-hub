"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  FileText,
  Settings,
  Activity,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/authors",
    label: "Authors",
    icon: Users,
  },
  {
    href: "/tweets",
    label: "Tweets",
    icon: MessageSquare,
  },
  {
    href: "/analysis",
    label: "Analysis",
    icon: BarChart3,
  },
  {
    href: "/content",
    label: "Content",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-6">
        <Activity className="h-5 w-5 text-foreground" />
        <span className="font-semibold tracking-tight">X Insight Hub</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          X Insight Hub v1.0.0
        </p>
      </div>
    </aside>
  );
}
