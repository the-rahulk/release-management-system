import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";

export function Header() {
  const { user } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", current: location === "/" },
    { name: "Release Plans", href: "/release-plans", current: location === "/release-plans" },
    { name: "Settings", href: "/settings", current: location === "/settings" },
  ];

  const getUserInitials = (user: any) => {
    if (!user) return "U";
    const first = user.firstName || user.email?.charAt(0) || "";
    const last = user.lastName || "";
    return (first.charAt(0) + last.charAt(0)).toUpperCase() || "U";
  };

  const getUserRole = (role: string) => {
    const roleMap = {
      release_manager: "Release Manager",
      team_lead: "Team Lead",
      poc: "POC",
      viewer: "Viewer",
    };
    return roleMap[role as keyof typeof roleMap] || "User";
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3" data-testid="link-home">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-project-diagram text-primary-foreground text-sm" />
              </div>
              <h1 className="text-xl font-bold text-foreground">iPlan</h1>
            </Link>
            
            <nav className="hidden md:flex space-x-6">
              {navigation.map((item) => (
                <Link 
                  key={item.name}
                  href={item.href}
                  className={`pb-4 transition-colors ${
                    item.current
                      ? "text-primary font-medium border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-link-${item.name.toLowerCase().replace(" ", "-")}`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
              <i className="fas fa-bell text-lg" />
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                3
              </span>
            </Button>

            {/* Settings */}
            <Link href="/settings">
              <Button variant="ghost" size="sm" data-testid="button-settings">
                <i className="fas fa-cog text-lg" />
              </Button>
            </Link>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground" data-testid="user-name">
                  {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "User"}
                </div>
                <div className="text-xs text-muted-foreground" data-testid="user-role">
                  {user ? getUserRole(user.role) : "Loading..."}
                </div>
              </div>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium" data-testid="user-initials">
                  {getUserInitials(user)}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
