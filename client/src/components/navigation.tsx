import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavigationItem {
  href: string;
  label: string;
}

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/goals", label: "Goals" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/financials", label: "Financials" },
  { href: "/insights", label: "AI Insights" },
];

export default function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="mb-8">
      <div className="border-b border-gray-200">
        <ul className="flex space-x-8">
          {navigationItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "py-2 px-1 border-b-2 font-medium transition-colors",
                  location === item.href
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
