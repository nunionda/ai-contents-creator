"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/projects", label: "Projects", icon: "🎬" },
  { href: "/pipeline", label: "Pipeline", icon: "⚙️" },
  { href: "/agents", label: "Agents", icon: "🤖" },
  { href: "/logline-guide", label: "Logline Guide", icon: "📝" },
  { href: "/prompt-guide", label: "Prompt Guide", icon: "🎨" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 flex-col border-r border-gray-800 bg-gray-950">
        <div className="border-b border-gray-800 px-6 py-5">
          <h1 className="text-lg font-bold tracking-tight">
            🎭 Marionette Studio
          </h1>
        </div>
        <nav className="flex-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-900 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-800 px-6 py-4 text-xs text-gray-500">
          Marionette v0.1.0
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-950 p-8">
        {children}
      </main>
    </div>
  );
}
