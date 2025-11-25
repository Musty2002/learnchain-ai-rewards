export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_type: string
          created_at: string | null
          description: string | null
          earned_at: string | null
          icon: string | null
          id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          achievement_type: string
          created_at?: string | null
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          achievement_type?: string
          created_at?: string | null
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          course_id: string | null
          created_at: string | null
          id: string
          language: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_order: number
          content: string
          course_id: string
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          chapter_order?: number
          content: string
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          chapter_order?: number
          content?: string
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_materials: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          material_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          id?: string
          material_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          material_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: Database["public"]["Enums"]["education_category"]
          created_at: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["education_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["education_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string | null
          id: string
          last_activity_at: string | null
          progress_percentage: number | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          enrolled_at?: string | null
          id?: string
          last_activity_at?: string | null
          progress_percentage?: number | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          enrolled_at?: string | null
          id?: string
          last_activity_at?: string | null
          progress_percentage?: number | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      math_solutions: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          language: string | null
          problem_text: string | null
          solution: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          problem_text?: string | null
          solution?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          problem_text?: string | null
          solution?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mesh_rooms: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          host_id: string
          host_name: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          host_id: string
          host_name: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          host_id?: string
          host_name?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      mesh_signaling: {
        Row: {
          created_at: string | null
          id: string
          peer_id: string
          peer_name: string
          room_code: string
          signal_data: Json
          signal_type: string
          target_peer_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          peer_id: string
          peer_name: string
          room_code: string
          signal_data: Json
          signal_type: string
          target_peer_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          peer_id?: string
          peer_name?: string
          room_code?: string
          signal_data?: Json
          signal_type?: string
          target_peer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mesh_signaling_room_code_fkey"
            columns: ["room_code"]
            isOneToOne: false
            referencedRelation: "mesh_rooms"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string | null
          current_streak: number | null
          email: string
          full_name: string
          guardian_consent: boolean | null
          id: string
          last_active_date: string | null
          longest_streak: number | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          current_streak?: number | null
          email: string
          full_name: string
          guardian_consent?: boolean | null
          id: string
          last_active_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          current_streak?: number | null
          email?: string
          full_name?: string
          guardian_consent?: boolean | null
          id?: string
          last_active_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          course_id: string
          created_at: string | null
          description: string
          hobby_context: string | null
          id: string
          proof_hash: string | null
          proof_url: string | null
          reward_amount: number
          status: Database["public"]["Enums"]["project_status"] | null
          title: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description: string
          hobby_context?: string | null
          id?: string
          proof_hash?: string | null
          proof_url?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["project_status"] | null
          title: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string
          hobby_context?: string | null
          id?: string
          proof_hash?: string | null
          proof_url?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["project_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: number
          created_at: string | null
          explanation: string | null
          id: string
          image_url: string | null
          options: Json
          points: number
          question: string
          question_type: Database["public"]["Enums"]["question_type"] | null
          quiz_id: string
        }
        Insert: {
          correct_answer: number
          created_at?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          options: Json
          points?: number
          question: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          quiz_id: string
        }
        Update: {
          correct_answer?: number
          created_at?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          options?: Json
          points?: number
          question?: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_submissions: {
        Row: {
          answers: Json
          attempt_number: number | null
          detailed_results: Json | null
          difficulty_level: string | null
          id: string
          needs_help: boolean | null
          passed: boolean
          quiz_id: string
          reward_issued: boolean
          score: number
          submitted_at: string | null
          time_taken: number | null
          user_id: string
        }
        Insert: {
          answers: Json
          attempt_number?: number | null
          detailed_results?: Json | null
          difficulty_level?: string | null
          id?: string
          needs_help?: boolean | null
          passed: boolean
          quiz_id: string
          reward_issued?: boolean
          score: number
          submitted_at?: string | null
          time_taken?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          attempt_number?: number | null
          detailed_results?: Json | null
          difficulty_level?: string | null
          id?: string
          needs_help?: boolean | null
          passed?: boolean
          quiz_id?: string
          reward_issued?: boolean
          score?: number
          submitted_at?: string | null
          time_taken?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          allow_retakes: boolean | null
          chapter_id: string | null
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          passing_score: number
          reward_amount: number
          show_explanations: boolean | null
          time_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_retakes?: boolean | null
          chapter_id?: string | null
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          passing_score?: number
          reward_amount?: number
          show_explanations?: boolean | null
          time_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_retakes?: boolean | null
          chapter_id?: string | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          passing_score?: number
          reward_amount?: number
          show_explanations?: boolean | null
          time_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      token_info: {
        Row: {
          contract_address: string
          created_at: string | null
          decimals: number
          id: string
          token_name: string
          token_symbol: string
          total_supply: number
        }
        Insert: {
          contract_address: string
          created_at?: string | null
          decimals?: number
          id?: string
          token_name: string
          token_symbol: string
          total_supply?: number
        }
        Update: {
          contract_address?: string
          created_at?: string | null
          decimals?: number
          id?: string
          token_name?: string
          token_symbol?: string
          total_supply?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_achievements: { Args: { _user_id: string }; Returns: undefined }
      cleanup_expired_rooms: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_quiz_reward: {
        Args: {
          p_quiz_id: string
          p_quiz_title: string
          p_reward_amount: number
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
      education_category: "primary" | "secondary" | "high_level"
      project_status: "pending" | "approved" | "rejected"
      question_type: "multiple_choice" | "true_false" | "fill_in_blank"
      transaction_type: "reward" | "transfer" | "redeem"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher", "admin"],
      education_category: ["primary", "secondary", "high_level"],
      project_status: ["pending", "approved", "rejected"],
      question_type: ["multiple_choice", "true_false", "fill_in_blank"],
      transaction_type: ["reward", "transfer", "redeem"],
    },
  },
} as const
