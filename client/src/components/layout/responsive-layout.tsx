import { useState } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, Building, FileText, PlaneTakeoff, Menu, X, LogOut, Zap, Settings, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { IntegrationsSettingsModal } from "@/components/modals/integrations-settings-modal";

interface ResponsiveLayoutProps {
  activeTab: string;
  children: React.ReactNode;
}

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, path: "/" },
  { id: "brands", label: "Brands", icon: Building, path: "/brands" },
  { id: "sponsorships", label: "Patrocinios & PDF", icon: Briefcase, path: "/sponsorships" },
  { id: "content", label: "Contenido", icon: FileText, path: "/content" },
  { id: "settings", label: "Ajustes & Integraciones", icon: Settings, path: "/settings" },
];

export function ResponsiveLayout({ activeTab, children }: ResponsiveLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const { user } = useAuth();

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

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
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col">
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "lg:hidden fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col z-50 transition-transform duration-200",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <PlaneTakeoff className="text-primary-foreground h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Brand Campaign</h1>
              <p className="text-xs text-muted-foreground">Saca Tech</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={closeMobileMenu}
            data-testid="close-mobile-menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link 
                    href={item.path}
                    onClick={closeMobileMenu}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors font-medium no-underline",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    data-testid={`mobile-nav-${item.id}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-card border-b border-border p-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsMobileMenuOpen(true)}
            data-testid="open-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <PlaneTakeoff className="text-primary-foreground h-3 w-3" />
            </div>
            <span className="text-sm font-semibold text-foreground">Brand Campaign</span>
          </div>
          
          <div className="w-8" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <IntegrationsSettingsModal
        open={showIntegrations}
        onOpenChange={setShowIntegrations}
      />
    </div>
  );
}