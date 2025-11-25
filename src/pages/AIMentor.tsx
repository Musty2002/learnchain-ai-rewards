import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIChatBox } from "@/components/AIChatBox";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AIMentor = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [hobby, setHobby] = useState("");
  const [generating, setGenerating] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [language, setLanguage] = useState("english");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchCourse();
    };
    checkAuth();
  }, [courseId, navigate]);

  const fetchCourse = async () => {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();
    setCourse(data);
  };

  const handleGenerateProjects = async () => {
    if (!hobby.trim()) {
      toast.error("Please enter your hobby");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-projects', {
        body: { courseId, hobby }
      });

      if (error) throw error;
      
      setProjects(data.projects);
      toast.success("Projects generated! Choose one to start.");
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || "Failed to generate projects");
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectProject = (projectId: string) => {
    navigate(`/submit-project/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">AI-Powered Learning</span>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {course?.title} Mentor
          </h1>
          <p className="text-muted-foreground">Get personalized projects and AI tutor support</p>
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
            <TabsTrigger value="projects">AI Projects</TabsTrigger>
            <TabsTrigger value="chat">AI Tutor Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            {projects.length === 0 ? (
              <Card className="shadow-elegant max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Tell us about yourself</CardTitle>
                  <CardDescription>
                    What's your hobby? We'll create learning projects that combine {course?.title} with what you love!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hobby">Your Hobby or Interest</Label>
                    <Input
                      id="hobby"
                      placeholder="e.g., Gaming, Sports, Music, Cooking..."
                      value={hobby}
                      onChange={(e) => setHobby(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateProjects()}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleGenerateProjects} 
                    disabled={generating || !hobby.trim()}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Projects...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate My Projects
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <h2 className="text-2xl font-bold mb-2">Your Personalized Projects</h2>
                    <p className="text-muted-foreground">Choose a project to get started</p>
                  </div>
                  <Button variant="outline" onClick={() => setProjects([])}>
                    Generate Different Projects
                  </Button>
                </div>

                <div className="grid gap-6 max-w-4xl mx-auto">
                  {projects.map((project) => (
                    <Card key={project.id} className="shadow-elegant hover:shadow-reward transition-all cursor-pointer border-2 hover:border-accent" onClick={() => handleSelectProject(project.id)}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-xl">{project.title}</CardTitle>
                          <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-accent to-secondary rounded-full">
                            <Sparkles className="w-4 h-4 text-white" />
                            <span className="text-sm font-bold text-white">+{project.reward_amount} LCT</span>
                          </div>
                        </div>
                        <CardDescription className="text-base mt-2">
                          {project.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full" onClick={() => handleSelectProject(project.id)}>
                          Start This Project
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">AI Tutor</h2>
                <p className="text-muted-foreground">Ask anything about {course?.title}</p>
              </div>
              <AIChatBox courseId={courseId} language={language} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIMentor;