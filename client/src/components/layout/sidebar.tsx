import { useState } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, Building, FileText, PlaneTakeoff, LogOut, Zap, Settings } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { IntegrationsSettingsModal } from "@/components/modals/integrations-settings-modal";

interface SidebarProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
}

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, path: "/" },
  { id: "brands", label: "Brands", icon: Building, path: "/brands" },
  { id: "content", label: "Content Templates", icon: FileText, path: "/content-templates" },
  { id: "settings", label: "Ajustes & Integraciones", icon: Settings, path: "/settings" },
];

export function Sidebar({ activeTab }: SidebarProps) {
  const { user } = useAuth();
  const [showIntegrations, setShowIntegrations] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = () => {
    if (!user) return "CS";
    const first = user.firstName ? user.firstName[0] : "";
    const last = user.lastName ? user.lastName[0] : "";
    return (first + last).toUpperCase() || user.email?.slice(0, 2).toUpperCase() || "US";
  };

  const getDisplayName = () => {
    if (!user) return "Carlos Saca";
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email?.split("@")[0] || "Usuario";
  };

  return (
    <>
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <PlaneTakeoff className="text-primary-foreground h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Brand Campaign Manager</h1>
              <p className="text-xs text-muted-foreground">Saca Tech</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link 
                    href={item.path}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors font-medium no-underline",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* ─── Integrations Button ─── */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium px-3 mb-2 uppercase tracking-wider">Integraciones</p>
            <button
              onClick={() => setShowIntegrations(true)}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              data-testid="nav-integrations"
            >
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Integraciones</span>
            </button>
          </div>
        </nav>
        
        <div className="p-4 border-t border-border flex flex-col gap-2">
          <div className="flex items-center space-x-3">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-muted-foreground text-sm font-medium">{getInitials()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{getDisplayName()}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || "c@saca.technology"}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground hover:text-destructive gap-2 text-xs" 
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <IntegrationsSettingsModal
        open={showIntegrations}
        onOpenChange={setShowIntegrations}
      />
    </>
  );
}
