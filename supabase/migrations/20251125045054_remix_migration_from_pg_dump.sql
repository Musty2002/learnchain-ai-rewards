CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'student',
    'teacher',
    'admin'
);


--
-- Name: education_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.education_category AS ENUM (
    'primary',
    'secondary',
    'high_level'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: question_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_type AS ENUM (
    'multiple_choice',
    'true_false',
    'fill_in_blank'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'reward',
    'transfer',
    'redeem'
);


--
-- Name: check_achievements(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_achievements(_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  quiz_count integer;
  course_count integer;
  total_earned integer;
BEGIN
  -- Check quiz completion achievement
  SELECT COUNT(*) INTO quiz_count
  FROM quiz_submissions
  WHERE user_id = _user_id AND passed = true;
  
  IF quiz_count >= 1 AND NOT EXISTS (
    SELECT 1 FROM achievements 
    WHERE user_id = _user_id AND achievement_type = 'first_quiz'
  ) THEN
    INSERT INTO achievements (user_id, achievement_type, title, description, icon)
    VALUES (_user_id, 'first_quiz', 'Quiz Master Beginner', 'Completed your first quiz!', '🎯');
  END IF;
  
  -- Check course enrollment achievement
  SELECT COUNT(*) INTO course_count
  FROM enrollments
  WHERE user_id = _user_id;
  
  IF course_count >= 5 AND NOT EXISTS (
    SELECT 1 FROM achievements 
    WHERE user_id = _user_id AND achievement_type = 'five_courses'
  ) THEN
    INSERT INTO achievements (user_id, achievement_type, title, description, icon)
    VALUES (_user_id, 'five_courses', 'Course Explorer', 'Enrolled in 5 courses!', '📚');
  END IF;
  
  -- Check token earning achievement
  SELECT COALESCE(balance, 0) INTO total_earned
  FROM wallets
  WHERE user_id = _user_id;
  
  IF total_earned >= 100 AND NOT EXISTS (
    SELECT 1 FROM achievements 
    WHERE user_id = _user_id AND achievement_type = 'hundred_tokens'
  ) THEN
    INSERT INTO achievements (user_id, achievement_type, title, description, icon)
    VALUES (_user_id, 'hundred_tokens', 'Token Collector', 'Earned 100 LCT!', '💰');
  END IF;
END;
$$;


--
-- Name: cleanup_expired_rooms(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_rooms() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE mesh_rooms 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  
  -- Insert default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  -- Create wallet with generated address
  INSERT INTO public.wallets (user_id, balance, wallet_address)
  VALUES (
    NEW.id, 
    0, 
    'LCT' || UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 40))
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: process_quiz_reward(uuid, uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_quiz_reward(p_user_id uuid, p_quiz_id uuid, p_reward_amount integer, p_quiz_title text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Get user's wallet
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = p_user_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;

  -- Create transaction record
  INSERT INTO transactions (wallet_id, amount, type, metadata)
  VALUES (
    v_wallet_id,
    p_reward_amount,
    'reward',
    jsonb_build_object('quiz_id', p_quiz_id, 'quiz_title', p_quiz_title)
  );

  -- Update wallet balance
  UPDATE wallets
  SET balance = balance + p_reward_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id;

  RETURN TRUE;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_streak(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_streak() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check if last active date is yesterday
  IF NEW.last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN
    NEW.current_streak := OLD.current_streak + 1;
  ELSIF NEW.last_active_date < CURRENT_DATE - INTERVAL '1 day' THEN
    NEW.current_streak := 1;
  END IF;
  
  -- Update longest streak
  IF NEW.current_streak > OLD.longest_streak THEN
    NEW.longest_streak := NEW.current_streak;
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    achievement_type text NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    earned_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    language text DEFAULT 'english'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    content text NOT NULL,
    chapter_order integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    material_order integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    category public.education_category NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now(),
    progress_percentage integer DEFAULT 0,
    last_activity_at timestamp with time zone DEFAULT now(),
    video_url text,
    CONSTRAINT enrollments_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)))
);


--
-- Name: math_solutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.math_solutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    image_url text,
    problem_text text,
    solution text,
    language text DEFAULT 'english'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: mesh_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mesh_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    host_id uuid NOT NULL,
    host_name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '02:00:00'::interval),
    CONSTRAINT code_length CHECK ((length(code) = 6))
);

ALTER TABLE ONLY public.mesh_rooms REPLICA IDENTITY FULL;


--
-- Name: mesh_signaling; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mesh_signaling (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_code text NOT NULL,
    peer_id text NOT NULL,
    peer_name text NOT NULL,
    target_peer_id text,
    signal_type text NOT NULL,
    signal_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT mesh_signaling_signal_type_check CHECK ((signal_type = ANY (ARRAY['offer'::text, 'answer'::text, 'ice-candidate'::text])))
);

ALTER TABLE ONLY public.mesh_signaling REPLICA IDENTITY FULL;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    age integer,
    guardian_consent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    last_active_date date
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    hobby_context text,
    reward_amount integer DEFAULT 10 NOT NULL,
    status public.project_status DEFAULT 'pending'::public.project_status,
    proof_url text,
    proof_hash text,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    question text NOT NULL,
    options jsonb NOT NULL,
    correct_answer integer NOT NULL,
    points integer DEFAULT 10 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    question_type public.question_type DEFAULT 'multiple_choice'::public.question_type,
    explanation text,
    image_url text
);


--
-- Name: quiz_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    quiz_id uuid NOT NULL,
    score integer NOT NULL,
    answers jsonb NOT NULL,
    passed boolean NOT NULL,
    reward_issued boolean DEFAULT false NOT NULL,
    submitted_at timestamp with time zone DEFAULT now(),
    needs_help boolean DEFAULT false,
    difficulty_level text DEFAULT 'medium'::text,
    attempt_number integer DEFAULT 1,
    time_taken integer,
    detailed_results jsonb,
    CONSTRAINT quiz_submissions_difficulty_level_check CHECK ((difficulty_level = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))
);


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    reward_amount integer DEFAULT 5 NOT NULL,
    passing_score integer DEFAULT 70 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    chapter_id uuid,
    time_limit integer,
    allow_retakes boolean DEFAULT true,
    show_explanations boolean DEFAULT true
);


--
-- Name: token_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_symbol text NOT NULL,
    token_name text NOT NULL,
    contract_address text NOT NULL,
    decimals integer DEFAULT 18 NOT NULL,
    total_supply bigint DEFAULT 1000000000 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    type public.transaction_type NOT NULL,
    amount integer NOT NULL,
    project_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'student'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    wallet_address text
);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_messages ai_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: course_materials course_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_materials
    ADD CONSTRAINT course_materials_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: math_solutions math_solutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.math_solutions
    ADD CONSTRAINT math_solutions_pkey PRIMARY KEY (id);


--
-- Name: mesh_rooms mesh_rooms_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesh_rooms
    ADD CONSTRAINT mesh_rooms_code_key UNIQUE (code);


--
-- Name: mesh_rooms mesh_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesh_rooms
    ADD CONSTRAINT mesh_rooms_pkey PRIMARY KEY (id);


--
-- Name: mesh_signaling mesh_signaling_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesh_signaling
    ADD CONSTRAINT mesh_signaling_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: quiz_submissions quiz_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_pkey PRIMARY KEY (id);


--
-- Name: quiz_submissions quiz_submissions_user_id_quiz_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_user_id_quiz_id_key UNIQUE (user_id, quiz_id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: token_info token_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_info
    ADD CONSTRAINT token_info_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);


--
-- Name: wallets wallets_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_wallet_address_key UNIQUE (wallet_address);


--
-- Name: idx_achievements_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievements_user_id ON public.achievements USING btree (user_id);


--
-- Name: idx_ai_chat_messages_user_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_chat_messages_user_course ON public.ai_chat_messages USING btree (user_id, course_id);


--
-- Name: idx_enrollments_progress; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_progress ON public.enrollments USING btree (user_id, progress_percentage);


--
-- Name: idx_math_solutions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_math_solutions_created_at ON public.math_solutions USING btree (created_at DESC);


--
-- Name: idx_math_solutions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_math_solutions_user_id ON public.math_solutions USING btree (user_id);


--
-- Name: idx_mesh_rooms_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mesh_rooms_active ON public.mesh_rooms USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_mesh_rooms_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mesh_rooms_code ON public.mesh_rooms USING btree (code);


--
-- Name: idx_mesh_signaling_room_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mesh_signaling_room_code ON public.mesh_signaling USING btree (room_code);


--
-- Name: idx_mesh_signaling_target_peer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mesh_signaling_target_peer ON public.mesh_signaling USING btree (target_peer_id);


--
-- Name: idx_quiz_submissions_user_quiz; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_submissions_user_quiz ON public.quiz_submissions USING btree (user_id, quiz_id);


--
-- Name: chapters update_chapters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: course_materials update_course_materials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_course_materials_updated_at BEFORE UPDATE ON public.course_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: courses update_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quizzes update_quizzes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_streak_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_streak_trigger BEFORE UPDATE OF last_active_date ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_user_streak();


--
-- Name: wallets update_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: achievements achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_chat_messages ai_chat_messages_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: ai_chat_messages ai_chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: math_solutions math_solutions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.math_solutions
    ADD CONSTRAINT math_solutions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mesh_rooms mesh_rooms_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesh_rooms
    ADD CONSTRAINT mesh_rooms_host_id_fkey FOREIGN KEY (host_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mesh_signaling mesh_signaling_room_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesh_signaling
    ADD CONSTRAINT mesh_signaling_room_code_fkey FOREIGN KEY (room_code) REFERENCES public.mesh_rooms(code) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: projects projects_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id);


--
-- Name: quiz_questions quiz_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quiz_submissions quiz_submissions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: chapters Admins can manage chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage chapters" ON public.chapters USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: course_materials Admins can manage course materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage course materials" ON public.course_materials USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: courses Admins can manage courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage courses" ON public.courses USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quiz_questions Admins can manage questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage questions" ON public.quiz_questions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quizzes Admins can manage quizzes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage quizzes" ON public.quizzes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: mesh_signaling Anyone can send signals to active rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can send signals to active rooms" ON public.mesh_signaling FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.mesh_rooms
  WHERE ((mesh_rooms.code = mesh_signaling.room_code) AND (mesh_rooms.is_active = true)))));


--
-- Name: mesh_rooms Anyone can view active rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active rooms" ON public.mesh_rooms FOR SELECT USING ((is_active = true));


--
-- Name: chapters Anyone can view chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view chapters" ON public.chapters FOR SELECT USING (true);


--
-- Name: course_materials Anyone can view course materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view course materials" ON public.course_materials FOR SELECT USING (true);


--
-- Name: courses Anyone can view courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (true);


--
-- Name: quiz_questions Anyone can view questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view questions" ON public.quiz_questions FOR SELECT USING (true);


--
-- Name: quizzes Anyone can view quizzes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view quizzes" ON public.quizzes FOR SELECT USING (true);


--
-- Name: mesh_signaling Anyone can view signals in active rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view signals in active rooms" ON public.mesh_signaling FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.mesh_rooms
  WHERE ((mesh_rooms.code = mesh_signaling.room_code) AND (mesh_rooms.is_active = true)))));


--
-- Name: token_info Anyone can view token info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view token info" ON public.token_info FOR SELECT USING (true);


--
-- Name: mesh_rooms Authenticated users can create rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create rooms" ON public.mesh_rooms FOR INSERT TO authenticated WITH CHECK ((auth.uid() = host_id));


--
-- Name: mesh_rooms Room hosts can delete their rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Room hosts can delete their rooms" ON public.mesh_rooms FOR DELETE TO authenticated USING ((auth.uid() = host_id));


--
-- Name: mesh_rooms Room hosts can update their rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Room hosts can update their rooms" ON public.mesh_rooms FOR UPDATE TO authenticated USING ((auth.uid() = host_id));


--
-- Name: projects Teachers and admins can update projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers and admins can update projects" ON public.projects FOR UPDATE USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: projects Teachers and admins can view all projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers and admins can view all projects" ON public.projects FOR SELECT USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: projects Users can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: quiz_submissions Users can create submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create submissions" ON public.quiz_submissions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_chat_messages Users can create their own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own chat messages" ON public.ai_chat_messages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: enrollments Users can enroll themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can enroll themselves" ON public.enrollments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: math_solutions Users can insert own solutions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own solutions" ON public.math_solutions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: projects Users can update their pending projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their pending projects" ON public.projects FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'pending'::public.project_status)));


--
-- Name: achievements Users can view leaderboard achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view leaderboard achievements" ON public.achievements FOR SELECT USING (true);


--
-- Name: math_solutions Users can view own solutions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own solutions" ON public.math_solutions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: enrollments Users can view their enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their enrollments" ON public.enrollments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: achievements Users can view their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own achievements" ON public.achievements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_chat_messages Users can view their own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own chat messages" ON public.ai_chat_messages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: projects Users can view their own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wallets Users can view their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: quiz_submissions Users can view their submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their submissions" ON public.quiz_submissions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view their wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their wallet transactions" ON public.transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.wallets
  WHERE ((wallets.id = transactions.wallet_id) AND (wallets.user_id = auth.uid())))));


--
-- Name: achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chapters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: course_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: math_solutions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.math_solutions ENABLE ROW LEVEL SECURITY;

--
-- Name: mesh_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mesh_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: mesh_signaling; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mesh_signaling ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: quizzes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

--
-- Name: token_info; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.token_info ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


