import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BookOpen, FileText, CheckCircle2, Sparkles, Rocket, Video } from "lucide-react";
import { toast } from "sonner";
import { FloatingAIChatWidget } from "@/components/FloatingAIChatWidget";
import ReactMarkdown from "react-markdown";

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showHobbyDialog, setShowHobbyDialog] = useState(false);
  const [hobby, setHobby] = useState("");
  const [language, setLanguage] = useState("english");
  const [enrolling, setEnrolling] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchCourseData();
    };
    checkAuthAndFetch();
  }, [courseId, navigate]);

  const fetchCourseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch course
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();
      setCourse(courseData);

      // Check enrollment
      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("id, video_url")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      setIsEnrolled(!!enrollData);
      if (enrollData?.video_url) {
        setVideoUrl(enrollData.video_url);
      }

      // Fetch materials
      const { data: materialsData } = await supabase
        .from("course_materials")
        .select("*")
        .eq("course_id", courseId)
        .order("material_order", { ascending: true });
      setMaterials(materialsData || []);

      // Fetch chapters with their quizzes
      const { data: chaptersData } = await supabase
        .from("chapters")
        .select(`
          *,
          quizzes:quizzes(*)
        `)
        .eq("course_id", courseId)
        .order("chapter_order", { ascending: true });
      setChapters(chaptersData || []);

      // Fetch all quizzes for the quizzes tab
      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select("*, chapters(title)")
        .eq("course_id", courseId);
      setQuizzes(quizzesData || []);

    } catch (error) {
      toast.error("Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setShowHobbyDialog(true);
  };

  const handleEnrollWithHobby = async () => {
    if (!hobby.trim()) {
      toast.error("Please enter your hobby to get personalized content.");
      return;
    }

    setEnrolling(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-personalized-course", {
        body: { courseId, hobby: hobby.trim(), language }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Enrolled successfully! Your personalized content is being generated and will be available shortly. Refresh the page in a moment.");
      setIsEnrolled(true);
      setShowHobbyDialog(false);
      setHobby("");
      setLanguage("english");
      
      // Refresh data after a delay to allow background generation
      setTimeout(() => {
        fetchCourseData();
      }, 3000);
    } catch (error: any) {
      console.error("Enrollment error:", error);
      toast.error(error.message || "Please try again later.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleGenerateVideo = async () => {
    setGeneratingVideo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();

      if (!enrollData) {
        toast.error("You must be enrolled to generate a video.");
        return;
      }

      toast.info("Generating your personalized video... This may take a moment.");

      const { data, error } = await supabase.functions.invoke("generate-personalized-course", {
        body: { 
          courseId, 
          hobby: "general",
          language: "english",
          generateVideoOnly: true
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Video generated successfully!");
      
      // Refresh to get the new video URL
      setTimeout(() => {
        fetchCourseData();
      }, 2000);
    } catch (error: any) {
      console.error("Video generation error:", error);
      toast.error(error.message || "Failed to generate video. Please try again.");
    } finally {
      setGeneratingVideo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Course Header */}
        <Card className="mb-8 shadow-elegant">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {course.title}
                </CardTitle>
                <CardDescription className="text-lg">{course.description}</CardDescription>
              </div>
              <BookOpen className="w-12 h-12 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {!isEnrolled ? (
              <Button onClick={handleEnrollClick} size="lg" className="gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Enroll in Course
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">You're enrolled!</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showHobbyDialog} onOpenChange={setShowHobbyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Personalize Your Learning
              </DialogTitle>
              <DialogDescription>
                Tell us about your hobby or interest! Our AI will generate personalized course materials, notes, and quizzes tailored just for you.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
              <div>
                <Label htmlFor="hobby">Your Hobby or Interest</Label>
                <Input
                  id="hobby"
                  placeholder="e.g., Photography, Gaming, Music, Cooking, Sports..."
                  value={hobby}
                  onChange={(e) => setHobby(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This helps us create engaging, personalized content that relates to what you love!
                </p>
              </div>

              <div>
                <Label>Preferred Language</Label>
                <RadioGroup value={language} onValueChange={setLanguage} className="mt-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="english" id="english" />
                    <Label htmlFor="english" className="font-normal cursor-pointer">English</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hausa" id="hausa" />
                    <Label htmlFor="hausa" className="font-normal cursor-pointer">Hausa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="igbo" id="igbo" />
                    <Label htmlFor="igbo" className="font-normal cursor-pointer">Igbo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yoruba" id="yoruba" />
                    <Label htmlFor="yoruba" className="font-normal cursor-pointer">Yoruba</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-2">
                  Course content will be generated in your selected language
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHobbyDialog(false)} disabled={enrolling}>
                Cancel
              </Button>
              <Button onClick={handleEnrollWithHobby} disabled={enrolling} className="gap-2">
                {enrolling ? (
                  <>Generating Content...</>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Enroll & Generate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isEnrolled && (
          <Tabs defaultValue="materials" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-8">
              <TabsTrigger value="materials">Handouts</TabsTrigger>
              <TabsTrigger value="chapters">Chapters</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="project">Project</TabsTrigger>
            </TabsList>

            {/* Course Materials */}
            <TabsContent value="materials">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Course Handouts & Notes
                  </CardTitle>
                  <CardDescription>
                    Read these materials before starting the chapters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {materials.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No handouts available yet
                    </p>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {materials.map((material) => (
                        <AccordionItem key={material.id} value={material.id}>
                          <AccordionTrigger className="text-lg font-medium">
                            {material.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground">
                              <ReactMarkdown>{material.content}</ReactMarkdown>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Chapters */}
            <TabsContent value="chapters">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-primary" />
                    Course Chapters
                  </CardTitle>
                  <CardDescription>
                    Complete each chapter and take the quiz to progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chapters.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No chapters available yet
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {chapters.map((chapter, index) => (
                        <Card key={chapter.id} className="border-2 border-muted hover:border-primary/50 transition-all">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>Chapter {index + 1}: {chapter.title}</span>
                              {chapter.quizzes && chapter.quizzes.length > 0 && (
                                <Button
                                  onClick={() => navigate(`/quiz/${chapter.quizzes[0].id}`)}
                                  variant="secondary"
                                  size="sm"
                                  className="gap-2"
                                >
                                  <FileText className="w-4 h-4" />
                                  Take Quiz
                                </Button>
                              )}
                            </CardTitle>
                            {chapter.description && (
                              <CardDescription>{chapter.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <Accordion type="single" collapsible>
                              <AccordionItem value="content">
                                <AccordionTrigger>View Chapter Content</AccordionTrigger>
                                <AccordionContent>
                                  <div className="prose prose-sm max-w-none dark:prose-invert">
                                    <p className="whitespace-pre-wrap">{chapter.content}</p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Video */}
            <TabsContent value="video">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-6 h-6 text-primary" />
                    Course Video
                  </CardTitle>
                  <CardDescription>
                    Personalized video content for this course
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 space-y-6">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                      <Rocket className="relative w-16 h-16 mx-auto text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Video Generation Coming Soon</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        AI-powered personalized video generation is currently under development. This feature will use advanced AI to create custom course introduction videos tailored to your interests.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quizzes */}
            <TabsContent value="quizzes">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    AI-Generated Quizzes
                  </CardTitle>
                  <CardDescription>
                    Personalized quizzes based on your hobby to test your knowledge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {quizzes.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No quizzes available yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {quizzes.map((quiz) => (
                        <Card key={quiz.id} className="border-2 border-muted hover:border-primary/50 transition-all">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <div>
                                <span className="text-lg">{quiz.title}</span>
                                {quiz.chapters && (
                                  <p className="text-sm text-muted-foreground font-normal mt-1">
                                    Related to: {quiz.chapters.title}
                                  </p>
                                )}
                              </div>
                              <Button
                                onClick={() => navigate(`/quiz/${quiz.id}`)}
                                className="gap-2"
                              >
                                <Sparkles className="w-4 h-4" />
                                Start Quiz
                              </Button>
                            </CardTitle>
                            {quiz.description && (
                              <CardDescription>{quiz.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Passing Score: {quiz.passing_score}%</span>
                              <span>•</span>
                              <span>Reward: {quiz.reward_amount} tokens</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Final Project */}
            <TabsContent value="project">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-6 h-6 text-primary" />
                    Final Project
                  </CardTitle>
                  <CardDescription>
                    Complete your course with a hands-on project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Button
                      onClick={() => navigate(`/submit-project?courseId=${courseId}`)}
                      size="lg"
                      className="gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      Generate & Submit Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!isEnrolled && (
          <Card className="shadow-elegant">
            <CardContent className="text-center py-16">
              <p className="text-lg text-muted-foreground mb-4">
                Enroll in this course to access personalized handouts, chapters, quizzes, and projects
              </p>
              <Button onClick={handleEnrollClick} size="lg" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Get Personalized Content
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {isEnrolled && <FloatingAIChatWidget courseId={courseId} language={language} />}
      
      <Footer />
    </div>
  );
};

export default CourseDetail;
