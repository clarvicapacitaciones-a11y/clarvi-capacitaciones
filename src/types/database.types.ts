// Generado con el MCP de Supabase (generate_typescript_types) a partir del
// esquema real del proyecto hwotaytvjjlvwkpnhotd. Regenerar tras cada
// migración nueva.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          area_id: string | null
          id: string
          scanned_at: string
          sucursal_id: string | null
          training_id: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          id?: string
          scanned_at?: string
          sucursal_id?: string | null
          training_id: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          id?: string
          scanned_at?: string
          sucursal_id?: string | null
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "user_training_status"
            referencedColumns: ["training_id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_training_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_attempt_answers: {
        Row: {
          attempt_id: string
          id: string
          is_correct: boolean
          points_awarded: number
          question_id: string | null
          question_snapshot: Json
          response: Json
        }
        Insert: {
          attempt_id: string
          id?: string
          is_correct?: boolean
          points_awarded?: number
          question_id?: string | null
          question_snapshot: Json
          response?: Json
        }
        Update: {
          attempt_id?: string
          id?: string
          is_correct?: boolean
          points_awarded?: number
          question_id?: string | null
          question_snapshot?: Json
          response?: Json
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          attempt_number: number
          exam_id: string
          id: string
          max_score: number | null
          passed: boolean | null
          score: number | null
          score_percent: number | null
          started_at: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          attempt_number: number
          exam_id: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          score?: number | null
          score_percent?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          exam_id?: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          score?: number | null
          score_percent?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_training_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          answer_key: Json
          content: Json
          created_at: string
          exam_id: string
          explanation: string | null
          id: string
          points: number
          position: number
          prompt: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
        }
        Insert: {
          answer_key?: Json
          content?: Json
          created_at?: string
          exam_id: string
          explanation?: string | null
          id?: string
          points?: number
          position: number
          prompt: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Update: {
          answer_key?: Json
          content?: Json
          created_at?: string
          exam_id?: string
          explanation?: string | null
          id?: string
          points?: number
          position?: number
          prompt?: string
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          is_published: boolean
          max_attempts: number | null
          passing_percent: number
          requires_video_completed: boolean
          shuffle_questions: boolean
          title: string | null
          training_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean
          max_attempts?: number | null
          passing_percent?: number
          requires_video_completed?: boolean
          shuffle_questions?: boolean
          title?: string | null
          training_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean
          max_attempts?: number | null
          passing_percent?: number
          requires_video_completed?: boolean
          shuffle_questions?: boolean
          title?: string | null
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_training_status"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "exams_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: true
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: true
            referencedRelation: "user_training_status"
            referencedColumns: ["training_id"]
          },
        ]
      }
      profiles: {
        Row: {
          area_id: string | null
          auth_method: Database["public"]["Enums"]["auth_method_type"]
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          sucursal_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          area_id?: string | null
          auth_method?: Database["public"]["Enums"]["auth_method_type"]
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          sucursal_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          area_id?: string | null
          auth_method?: Database["public"]["Enums"]["auth_method_type"]
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          sucursal_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      training_areas: {
        Row: {
          area_id: string
          training_id: string
        }
        Insert: {
          area_id: string
          training_id: string
        }
        Update: {
          area_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_areas_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_areas_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "user_training_status"
            referencedColumns: ["training_id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          qr_token: string
          session_date: string | null
          title: string
          updated_at: string
          youtube_video_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          qr_token?: string
          session_date?: string | null
          title: string
          updated_at?: string
          youtube_video_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          qr_token?: string
          session_date?: string | null
          title?: string
          updated_at?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_training_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      watch_progress: {
        Row: {
          completed_at: string | null
          first_started_at: string
          id: string
          last_heartbeat_at: string
          last_position_seconds: number
          session_count: number
          training_id: string
          user_id: string
          video_duration_seconds: number | null
          watch_percent: number | null
          watched_ranges: Json
          watched_seconds: number
        }
        Insert: {
          completed_at?: string | null
          first_started_at?: string
          id?: string
          last_heartbeat_at?: string
          last_position_seconds?: number
          session_count?: number
          training_id: string
          user_id: string
          video_duration_seconds?: number | null
          watch_percent?: number | null
          watched_ranges?: Json
          watched_seconds?: number
        }
        Update: {
          completed_at?: string | null
          first_started_at?: string
          id?: string
          last_heartbeat_at?: string
          last_position_seconds?: number
          session_count?: number
          training_id?: string
          user_id?: string
          video_duration_seconds?: number | null
          watch_percent?: number | null
          watched_ranges?: Json
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "watch_progress_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_progress_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "user_training_status"
            referencedColumns: ["training_id"]
          },
          {
            foreignKeyName: "watch_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_training_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      user_training_status: {
        Row: {
          attended_in_person: boolean | null
          completed_at: string | null
          description: string | null
          exam_best_percent: number | null
          exam_passed: boolean | null
          has_exam: boolean | null
          last_heartbeat_at: string | null
          last_position_seconds: number | null
          session_date: string | null
          status: string | null
          title: string | null
          training_id: string | null
          user_id: string | null
          video_duration_seconds: number | null
          watch_percent: number | null
          watched_seconds: number | null
          youtube_video_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assert_question_shape: {
        Args: {
          p_answer_key: Json
          p_content: Json
          p_type: Database["public"]["Enums"]["question_type"]
        }
        Returns: undefined
      }
      checkin_via_qr: {
        Args: { p_token: string }
        Returns: {
          status: string
          training_title: string
        }[]
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      exam_status_for_training: {
        Args: { p_training_id: string }
        Returns: Json
      }
      grade_answer: {
        Args: {
          p_answer_key: Json
          p_content: Json
          p_response: Json
          p_type: Database["public"]["Enums"]["question_type"]
        }
        Returns: number
      }
      normalize_text: { Args: { p_value: string }; Returns: string }
      public_question_content: {
        Args: {
          p_content: Json
          p_shuffle: boolean
          p_type: Database["public"]["Enums"]["question_type"]
        }
        Returns: Json
      }
      save_exam: {
        Args: { p_exam: Json; p_questions: Json; p_training_id: string }
        Returns: string
      }
      set_training_areas: {
        Args: { p_area_ids: string[]; p_training_id: string }
        Returns: undefined
      }
      shuffle_jsonb_array: { Args: { p_items: Json }; Returns: Json }
      start_exam_attempt: { Args: { p_training_id: string }; Returns: Json }
      submit_exam_attempt: {
        Args: { p_answers: Json; p_attempt_id: string }
        Returns: Json
      }
      training_title_for_token: { Args: { p_token: string }; Returns: string }
      upsert_watch_progress: {
        Args: {
          p_duration: number
          p_position: number
          p_ranges: Json
          p_training_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      auth_method_type: "email" | "username"
      question_type:
        | "multiple_choice"
        | "multiple_select"
        | "true_false"
        | "matching"
        | "ordering"
        | "fill_blank"
      user_role: "owner" | "administrador" | "usuario"
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
      auth_method_type: ["email", "username"],
      question_type: [
        "multiple_choice",
        "multiple_select",
        "true_false",
        "matching",
        "ordering",
        "fill_blank",
      ],
      user_role: ["owner", "administrador", "usuario"],
    },
  },
} as const
