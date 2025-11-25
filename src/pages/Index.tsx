import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GraduationCap, Sparkles, Trophy, Wallet, Languages, Network } from "lucide-react";
import heroImage from "@/assets/hero-education.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">AI-Powered Learning Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Learn Smarter,{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Earn Rewards
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground">
              Transform your education with personalized AI mentoring and blockchain-based rewards. 
              Learn in English, Hausa, Igbo, or Yoruba. Complete projects, earn tokens, and unlock your potential.
            </p>
            
            <div className="flex gap-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 shadow-glow">
                <GraduationCap className="w-5 h-5" />
                Start Learning Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/courses")}>
                Browse Courses
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <img 
              src={heroImage} 
              alt="Students learning with AI technology" 
              className="rounded-2xl shadow-elegant w-full"
            />
            <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-lg shadow-reward border-2 border-accent/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Earn Rewards</p>
                  <p className="text-lg font-bold">+10 LearnChain Token (LCT)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">LearnChain</span>?
          </h2>
          <p className="text-muted-foreground text-lg">Everything you need for personalized, rewarding education</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="p-6 rounded-xl bg-card border border-border shadow-elegant hover:shadow-glow transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI-Powered Mentoring</h3>
            <p className="text-muted-foreground">
              Get personalized micro-projects tailored to your hobbies and interests. Learn what you love!
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border shadow-elegant hover:shadow-glow transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-secondary-glow flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Earn Real Rewards</h3>
            <p className="text-muted-foreground">
              Complete projects and earn LearnChain Token (LCT). Your hard work deserves recognition!
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border shadow-elegant hover:shadow-glow transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-accent-glow flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Verified Achievement</h3>
            <p className="text-muted-foreground">
              Teacher-verified projects with immutable proof. Build a portfolio that matters.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border shadow-elegant hover:shadow-glow transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
              <Languages className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Multi-Language Support</h3>
            <p className="text-muted-foreground">
              Learn in your preferred language: English, Hausa, Igbo, or Yoruba. Education without barriers!
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border shadow-elegant hover:shadow-glow transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-4">
              <Network className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">First Mesh Network Platform</h3>
            <p className="text-muted-foreground">
              Revolutionary peer-to-peer course sharing. Learn offline and connect directly with peers!
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent p-12 md:p-16 shadow-reward">
          <div className="relative z-10 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Learning?</h2>
            <p className="text-lg mb-8 text-white/90">
              Join thousands of students earning rewards while mastering new skills
            </p>
            <Button size="lg" variant="secondary" onClick={() => navigate("/auth")} className="gap-2">
              <GraduationCap className="w-5 h-5" />
              Get Started Now
            </Button>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;
