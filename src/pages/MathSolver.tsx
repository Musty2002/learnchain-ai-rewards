import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CameraCapture } from "@/components/CameraCapture";
import { Camera, Loader2, BookOpen, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMathImage } from "@/lib/uploadMathImage";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import imageCompression from 'browser-image-compression';

export default function MathSolver() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [language, setLanguage] = useState("english");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleImageCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setShowCamera(false);
    setLoading(true);

    try {
      // Upload image
      const imageUrl = await uploadMathImage(imageData, user.id);
      
      if (!imageUrl) {
        throw new Error("Failed to upload image");
      }

      // Call edge function to solve
      const { data, error } = await supabase.functions.invoke('solve-math-problem', {
        body: {
          imageData,
          language,
          userId: user.id,
          imageUrl
        }
      });

      if (error) throw error;

      setSolution(data.solution);
      toast.success("Problem solved! 🎉");
    } catch (error: any) {
      console.error("Error solving problem:", error);
      toast.error(error.message || "Failed to solve problem");
    } finally {
      setLoading(false);
    }
  };

  const handleNewProblem = () => {
    setCapturedImage(null);
    setSolution(null);
    setShowCamera(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const imageData = reader.result as string;
        handleImageCapture(imageData);
      };
      
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image');
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const languageNames = {
    english: "English",
    hausa: "Hausa (Hausa)",
    yoruba: "Yoruba (Èdè Yorùbá)",
    igbo: "Igbo (Asụsụ Igbo)"
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">AI Math Solver 📸🔢</h1>
            <p className="text-muted-foreground">
              Take a photo of any math problem and get step-by-step solutions in your language
            </p>
          </div>

          {/* Language Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Language</CardTitle>
              <CardDescription>Solutions will be explained in your preferred language</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(languageNames).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Camera Section */}
          {!showCamera && !capturedImage && (
            <Card>
              <CardContent className="p-12 text-center space-y-4">
                <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Ready to Solve a Problem?</h3>
                  <p className="text-muted-foreground">
                    Take a clear photo of your math problem or upload from gallery
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => setShowCamera(true)} size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    Open Camera
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} size="lg" variant="outline">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Image
                  </Button>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>
          )}

          {showCamera && (
            <CameraCapture
              onImageCapture={handleImageCapture}
              onClose={() => setShowCamera(false)}
            />
          )}

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="p-12 text-center space-y-4">
                <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Solving Your Problem...</h3>
                  <p className="text-muted-foreground">
                    Our AI is analyzing the math problem and preparing a detailed solution
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Solution Display */}
          {solution && !loading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Solution in {languageNames[language as keyof typeof languageNames]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {capturedImage && (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <img src={capturedImage} alt="Math problem" className="w-full h-full object-contain" />
                  </div>
                )}
                
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{solution}</ReactMarkdown>
                </div>

                <Button onClick={handleNewProblem} className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Solve Another Problem
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
