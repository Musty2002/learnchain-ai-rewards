import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Sparkles, Languages, BookOpen, Loader2, Copy, Check, Upload, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export const DocumentPersonalizer = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState("");
  const [personalizationType, setPersonalizationType] = useState("hobby_rewrite");
  const [language, setLanguage] = useState("english");
  const [hobby, setHobby] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [copied, setCopied] = useState(false);

  const extractTextFromFile = async (selectedFile: File): Promise<string> => {
    const type = selectedFile.type;
    
    // Plain text files
    if (type === "text/plain" || selectedFile.name.endsWith(".txt") || selectedFile.name.endsWith(".md")) {
      return await selectedFile.text();
    }

    // For PDF, DOCX etc. - read as text (basic extraction)
    // We'll send the base64 content to the edge function for AI extraction
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(`__BASE64_FILE__:${selectedFile.name}:${base64}`);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(selectedFile);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selected.size > maxSize) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const allowedExtensions = [".pdf", ".doc", ".docx", ".txt", ".md"];
    const ext = "." + selected.name.split(".").pop()?.toLowerCase();

    if (!allowedTypes.includes(selected.type) && !allowedExtensions.includes(ext)) {
      toast.error("Unsupported file type. Please upload PDF, Word, or text files.");
      return;
    }

    setFile(selected);
    setExtracting(true);

    try {
      const text = await extractTextFromFile(selected);
      setFileText(text);
      toast.success(`"${selected.name}" loaded successfully!`);
    } catch (err) {
      console.error("File extraction error:", err);
      toast.error("Failed to read the file. Please try again.");
      setFile(null);
      setFileText("");
    } finally {
      setExtracting(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileText("");
  };

  const handlePersonalize = async () => {
    if (!file || !fileText) {
      toast.error("Please upload a document first.");
      return;
    }

    if (personalizationType === "hobby_rewrite" && !hobby.trim()) {
      toast.error("Please enter your hobby for personalization.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const { data, error } = await supabase.functions.invoke("personalize-document", {
        body: {
          text: fileText,
          personalizationType,
          language,
          hobby: hobby.trim(),
          filename: file.name,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data.personalizedText);
      toast.success("Document personalized successfully!");
    } catch (error: any) {
      console.error("Personalization error:", error);
      toast.error(error.message || "Failed to personalize. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Document Personalizer
        </CardTitle>
        <CardDescription>
          Upload any handout or academic document to personalize it with AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div>
          <Label>Upload your document</Label>
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to upload a document</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Word (.doc, .docx), or Text files up to 10MB
              </p>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {extracting ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleRemoveFile}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Personalization Options */}
        <div>
          <Label>Personalization Type</Label>
          <RadioGroup value={personalizationType} onValueChange={setPersonalizationType} className="mt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hobby_rewrite" id="pr-hobby" />
              <Label htmlFor="pr-hobby" className="font-normal cursor-pointer flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Rewrite with my hobby/interest
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="translation" id="pr-translate" />
              <Label htmlFor="pr-translate" className="font-normal cursor-pointer flex items-center gap-1">
                <Languages className="w-3.5 h-3.5 text-primary" /> Translate to another language
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="simplify" id="pr-simplify" />
              <Label htmlFor="pr-simplify" className="font-normal cursor-pointer flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-primary" /> Summarize & simplify
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Hobby Input */}
        {personalizationType === "hobby_rewrite" && (
          <div>
            <Label htmlFor="hobby-input">Your Hobby / Interest</Label>
            <Input
              id="hobby-input"
              placeholder="e.g., Football, Music, Cooking..."
              value={hobby}
              onChange={(e) => setHobby(e.target.value)}
              className="mt-1"
            />
          </div>
        )}

        {/* Language Selector */}
        <div>
          <Label>Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="hausa">Hausa</SelectItem>
              <SelectItem value="igbo">Igbo</SelectItem>
              <SelectItem value="yoruba">Yoruba</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handlePersonalize} disabled={loading || !file || extracting} className="w-full gap-2">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Personalizing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Personalize Document
            </>
          )}
        </Button>

        {/* Result */}
        {result && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Personalized Result</Label>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-[400px] overflow-y-auto prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
