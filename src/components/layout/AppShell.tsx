import { Link } from "@tanstack/react-router";
import {
  BookOpenCheck, Droplets, FileText, FlaskConical, GraduationCap, History, LayoutDashboard, Map as MapIcon, Menu, HardDrive,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/analysis", label: "Water Analysis", icon: FlaskConical, exact: false },
  { to: "/map", label: "Water Quality Map", icon: MapIcon, exact: false },
  { to: "/reports", label: "Report Generator", icon: FileText, exact: false },
  { to: "/history", label: "History", icon: History, exact: false },
  { to: "/education", label: "Education Centre", icon: GraduationCap, exact: false },
  { to: "/methodology", label: "Methodology", icon: BookOpenCheck, exact: false },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-ocean shadow-elevated">
        <Droplets className="size-5 text-primary-foreground" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-bold text-sidebar-foreground">AquaSentinel AI</span>
        <span className="block text-[11px] text-sidebar-muted">Water quality intelligence</span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: item.exact }}
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground shadow-inner" }}
        >
          <item.icon className="size-4 shrink-0 text-sidebar-primary" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">6</span>
          <div className="text-xs leading-tight">
            <p className="font-semibold text-sidebar-foreground">UN SDG 6</p>
            <p className="text-sidebar-muted">Clean Water & Sanitation</p>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-2 px-1 text-[11px] text-sidebar-muted">
        <HardDrive className="size-3.5" /> Data is stored on this device
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between bg-sidebar p-5 lg:flex">
        <div className="space-y-8">
          <Logo />
          <NavList />
        </div>
        <SidebarFooter />
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <Logo />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open navigation menu"
            className="rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col justify-between border-sidebar-border bg-sidebar p-5 [&>button]:text-sidebar-foreground">
            <div className="space-y-8">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Logo />
              <NavList onNavigate={() => setOpen(false)} />
            </div>
            <SidebarFooter />
          </SheetContent>
        </Sheet>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
