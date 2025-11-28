import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, GraduationCap, Wallet, Network, Camera, Home, BookOpen, User, X } from "lucide-react";
import { useState } from "react";

interface MobileNavProps {
  user: any;
  onSignOut: () => void;
}

export const MobileNav = ({ user, onSignOut }: MobileNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg" onClick={() => setOpen(false)}>
              <GraduationCap className="w-6 h-6 text-primary" />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                LearnChain
              </span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Links */}
          {user ? (
            <nav className="flex-1 p-4 space-y-2">
              <Button
                variant={isActive("/dashboard") ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => handleNavigation("/dashboard")}
              >
                <Home className="w-5 h-5" />
                Dashboard
              </Button>

              <Button
                variant={isActive("/courses") ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => handleNavigation("/courses")}
              >
                <BookOpen className="w-5 h-5" />
                Courses
              </Button>

              <Button
                variant={isActive("/math-solver") ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => handleNavigation("/math-solver")}
              >
                <Camera className="w-5 h-5" />
                Math Solver
              </Button>

              <Button
                variant={isActive("/mesh-network") ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => handleNavigation("/mesh-network")}
              >
                <Network className="w-5 h-5" />
                Offline Learning
              </Button>

              <Button
                variant={isActive("/wallet") ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => handleNavigation("/wallet")}
              >
                <Wallet className="w-5 h-5" />
                Wallet
              </Button>
            </nav>
          ) : (
            <nav className="flex-1 p-4 space-y-2">
              <Button
                className="w-full"
                onClick={() => handleNavigation("/auth")}
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleNavigation("/auth")}
              >
                Sign In
              </Button>
            </nav>
          )}

          {/* Profile Section at Bottom */}
          {user && (
            <div className="p-4 border-t border-border space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">View Profile</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onSignOut();
                  setOpen(false);
                }}
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
