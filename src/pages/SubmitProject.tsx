import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const SubmitProject = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*, courses(title)")
      .eq("id", projectId)
      .single();
    setProject(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload proof of completion");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${projectId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project_proofs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("project_proofs")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("projects")
        .update({ proof_url: publicUrl })
        .eq("id", projectId);

      if (updateError) throw updateError;

      toast.success("Project submitted for verification!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Submission failed");
    } finally {
      setUploading(false);
    }
  };

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-accent" />
              Submit Your Project
            </CardTitle>
            <CardDescription>{project.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Project Description</h3>
                <p className="text-muted-foreground">{project.description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof">Upload Proof (Image/Video)</Label>
                <Input
                  id="proof"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <Button type="submit" disabled={uploading} className="w-full gap-2">
                {uploading ? "Uploading..." : <><Upload className="w-4 h-4" /> Submit for Verification</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmitProject;