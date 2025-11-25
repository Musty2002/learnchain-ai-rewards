import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";

const Courses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<{ [key: string]: number }>({});
  const [quizzes, setQuizzes] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchCourses();
    };
    checkAuth();
  }, [navigate]);

  const fetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .order("category", { ascending: true });
      setCourses(coursesData || []);

      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("course_id, progress_percentage")
        .eq("user_id", user.id);
      
      const enrollmentMap = (enrollData || []).reduce((acc, e) => {
        acc[e.course_id] = e.progress_percentage || 0;
        return acc;
      }, {} as { [key: string]: number });
      setEnrollments(enrollmentMap);

      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select("*");
      
      const quizzesByCourse = (quizzesData || []).reduce((acc, quiz) => {
        acc[quiz.course_id] = quiz;
        return acc;
      }, {} as { [key: string]: any });
      setQuizzes(quizzesByCourse);

    } catch (error) {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("enrollments")
        .insert({ user_id: user.id, course_id: courseId });

      if (error) throw error;
      
      toast.success("Enrolled successfully!");
      navigate(`/ai-mentor/${courseId}`);
    } catch (error: any) {
      toast.error(error.message || "Enrollment failed");
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.replace('_', '-').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Explore Courses
          </h1>
          <p className="text-muted-foreground">Choose your learning path and earn rewards</p>
        </div>

        <Tabs defaultValue="primary" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
            <TabsTrigger value="primary">Primary</TabsTrigger>
            <TabsTrigger value="secondary">Secondary</TabsTrigger>
            <TabsTrigger value="high_level">High Level</TabsTrigger>
          </TabsList>

          {['primary', 'secondary', 'high_level'].map(category => (
            <TabsContent key={category} value={category}>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.filter(c => c.category === category).map(course => {
                  const progress = enrollments[course.id];
                  const isEnrolled = progress !== undefined;
                  
                  return (
                    <Card key={course.id} className="shadow-elegant hover:shadow-glow transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <BookOpen className="w-10 h-10 text-primary mb-2" />
                          {isEnrolled && (
                            <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                              Enrolled
                            </span>
                          )}
                        </div>
                        <CardTitle>{course.title}</CardTitle>
                        <CardDescription className="text-sm">{course.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="space-y-4">
                          {isEnrolled && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium text-primary">{progress}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {getCategoryLabel(course.category)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => navigate(`/course/${course.id}`)}
                              variant="default"
                              className="flex-1 gap-2"
                            >
                              <BookOpen className="w-4 h-4" />
                              View Course
                            </Button>
                            {isEnrolled && (
                              <Button
                                onClick={() => navigate(`/ai-mentor/${course.id}`)}
                                variant="outline"
                                className="gap-2"
                              >
                                <Sparkles className="w-4 h-4" />
                                AI Mentor
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
};

export default Courses;