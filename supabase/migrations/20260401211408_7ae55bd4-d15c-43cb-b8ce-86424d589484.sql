
-- Create personalized_documents table
CREATE TABLE public.personalized_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_filename TEXT,
  original_text TEXT NOT NULL,
  personalized_text TEXT,
  personalization_type TEXT NOT NULL DEFAULT 'hobby_rewrite',
  language TEXT DEFAULT 'english',
  hobby TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personalized_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own documents"
  ON public.personalized_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON public.personalized_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.personalized_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.personalized_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_personalized_documents_updated_at
  BEFORE UPDATE ON public.personalized_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('document-uploads', 'document-uploads', false);

-- Storage policies
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'document-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'document-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'document-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
