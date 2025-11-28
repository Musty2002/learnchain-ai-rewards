import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { GraduationCap, Wallet, Network, Camera } from "lucide-react";
import { MeshNetworkStatus } from "./MeshNetworkStatus";
import { MobileNav } from "./MobileNav";

export const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          <GraduationCap className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          <span className="hidden sm:inline">LearnChain</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4">
          {user ? (
            <>
              <MeshNetworkStatus />
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/math-solver")} className="gap-2">
                <Camera className="w-4 h-4" />
                Math Solver
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/mesh-network")} className="gap-2">
                <Network className="w-4 h-4" />
                Offline
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/wallet")} className="gap-2">
                <Wallet className="w-4 h-4" />
                Wallet
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate("/auth")}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          {user && <MeshNetworkStatus />}
          <MobileNav user={user} onSignOut={handleSignOut} />
        </div>
      </div>
    </nav>
  );
};
