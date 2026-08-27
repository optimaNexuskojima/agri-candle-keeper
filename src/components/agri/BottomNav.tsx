import { Link } from "@tanstack/react-router";
import { BarChart3, LayoutDashboard, NotebookPen, PlusCircle, Settings } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/goods", label: "Goods", icon: BarChart3 },
  { to: "/add-price", label: "Add Price", icon: PlusCircle },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="border-border bg-background/95 safe-bottom fixed inset-x-0 bottom-0 z-40 border-t pt-1 backdrop-blur">
      <ul className="mx-auto flex max-w-3xl">
        {ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="text-muted-foreground flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide uppercase"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
