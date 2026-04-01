import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Sparkles, Languages, BookOpen, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export const DocumentPersonalizer = () => {
  const [text, setText] = useState("");
  const [personalizationType, setPersonalizationType] = useState("hobby_rewrite");
  const [language, setLanguage] = useState("english");
  const [hobby, setHobby] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handlePersonalize = async () => {
    if (!text.trim()) {
      toast.error("Please paste or type your document content first.");
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
        body: { text: text.trim(), personalizationType, language, hobby: hobby.trim() },
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
          Paste any handout or academic text to personalize it with AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div>
          <Label htmlFor="doc-text">Paste your document content</Label>
          <Textarea
            id="doc-text"
            placeholder="Paste your handout, notes, or academic text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 min-h-[120px]"
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

        <Button onClick={handlePersonalize} disabled={loading} className="w-full gap-2">
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
