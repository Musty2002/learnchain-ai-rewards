import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ProgressBar";
import { AchievementBadge } from "@/components/AchievementBadge";
import { Wallet, BookOpen, Trophy, Sparkles, Network, Camera } from "lucide-react";
import { toast } from "sonner";
import { offlineStorage } from "@/lib/offlineStorage";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [offlineCoursesCount, setOfflineCoursesCount] = useState(0);
  const [mathSolutionsCount, setMathSolutionsCount] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchData();
    };
    checkAuth();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update last active date for streak tracking
      await supabase
        .from('profiles')
        .update({ last_active_date: new Date().toISOString().split('T')[0] })
        .eq('id', user.id);

      // Check for new achievements
      await supabase.rpc('check_achievements', { _user_id: user.id });

      // Fetch profile with streak data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });
      setAchievements(achievementsData || []);

      // Fetch wallet
      const { data: walletData } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setWallet(walletData);

      // Fetch projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*, courses(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setProjects(projectsData || []);

      // Fetch enrollments with progress
      const { data: enrollmentsData } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user.id);
      setEnrollments(enrollmentsData || []);

      // Fetch offline courses count
      const storageInfo = await offlineStorage.getStorageSize();
      setOfflineCoursesCount(storageInfo.courses);

      // Fetch math solutions count
      const { data: mathSolutions } = await supabase
        .from("math_solutions")
        .select("id", { count: 'exact' })
        .eq("user_id", user.id);
      setMathSolutionsCount(mathSolutions?.length || 0);

    } catch (error: any) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Your Learning Dashboard
            </h1>
            <p className="text-muted-foreground">Track your progress and earn rewards</p>
          </div>
          {profile && (
            <div className="flex items-center gap-4">
              <Card className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                    <p className="text-xl font-bold">{profile.current_streak} days</p>
                  </div>
                </div>
              </Card>
              <Card className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="text-sm text-muted-foreground">Achievements</p>
                    <p className="text-xl font-bold">{achievements.length}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-elegant hover:shadow-glow transition-shadow cursor-pointer" onClick={() => navigate("/wallet")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">LearnChain Token Balance</CardTitle>
                  <Wallet className="w-4 h-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                    {wallet?.balance || 0} LCT
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Click to view wallet</p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                  <BookOpen className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{enrollments.length}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/courses")}>
                      Browse courses
                    </Button>
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
                  <Trophy className="w-4 h-4 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {projects.filter(p => p.status === 'approved').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Keep learning!</p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-glow transition-shadow cursor-pointer" onClick={() => navigate("/mesh-network")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Offline Courses</CardTitle>
                  <Network className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{offlineCoursesCount}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Available without internet
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-glow transition-shadow cursor-pointer" onClick={() => navigate("/math-solver")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Math Problems Solved</CardTitle>
                  <Camera className="w-4 h-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{mathSolutionsCount}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    AI-powered solutions
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Recent Projects
                </CardTitle>
                <CardDescription>Your latest learning activities</CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No projects yet</p>
                    <Button onClick={() => navigate("/courses")}>
                      Start Learning
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                        <div>
                          <h3 className="font-semibold">{project.title}</h3>
                          <p className="text-sm text-muted-foreground">{project.courses?.title}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={
                            project.status === 'approved' ? 'default' :
                            project.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {project.status}
                          </Badge>
                          <span className="text-sm font-medium text-accent">+{project.reward_amount} LCT</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Course Progress</CardTitle>
                <CardDescription>Track your learning journey</CardDescription>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Enroll in courses to track your progress!</p>
                    <Button onClick={() => navigate("/courses")}>Browse Courses</Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{enrollment.courses?.title}</h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/course/${enrollment.course_id}`)}
                          >
                            Continue
                          </Button>
                        </div>
                        <ProgressBar value={enrollment.progress_percentage || 0} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Your Achievements</CardTitle>
                <CardDescription>Badges earned through learning</CardDescription>
              </CardHeader>
              <CardContent>
                {achievements.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Complete quizzes and courses to earn achievements!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement) => (
                      <AchievementBadge key={achievement.id} achievement={achievement} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
};

export default Dashboard;