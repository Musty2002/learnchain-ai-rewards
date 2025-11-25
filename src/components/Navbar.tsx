import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { GraduationCap, Wallet, Network, Camera } from "lucide-react";
import { MeshNetworkStatus } from "./MeshNetworkStatus";

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
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          <GraduationCap className="w-8 h-8 text-primary" />
          LearnChain
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <MeshNetworkStatus />
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
              <Button variant="ghost" onClick={() => navigate("/math-solver")} className="gap-2">
                <Camera className="w-4 h-4" />
                Math Solver
              </Button>
              <Button variant="ghost" onClick={() => navigate("/mesh-network")} className="gap-2">
                <Network className="w-4 h-4" />
                Offline
              </Button>
              <Button variant="ghost" onClick={() => navigate("/wallet")} className="gap-2">
                <Wallet className="w-4 h-4" />
                Wallet
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")}>
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};