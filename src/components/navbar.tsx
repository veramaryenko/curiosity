"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dziś" },
  { href: "/history", label: "Historia" },
  { href: "/settings", label: "Ustawienia" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-lg font-semibold text-primary">
          Curiosity
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/challenge/discover"
            className="mr-1 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Nowa przygoda
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
