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
      answer_events: {
        Row: {
          attempt_id: string
          chapter_id: string
          chosen_answer_id: string | null
          created_at: string
          id: string
          is_correct: boolean
          question_id: string | null
          user_id: string
        }
        Insert: {
          attempt_id: string
          chapter_id: string
          chosen_answer_id?: string | null
          created_at?: string
          id?: string
          is_correct: boolean
          question_id?: string | null
          user_id: string
        }
        Update: {
          attempt_id?: string
          chapter_id?: string
          chosen_answer_id?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_events_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_events_chosen_answer_id_fkey"
            columns: ["chosen_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_events_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
          text: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id: string
          text: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      barem_criterii: {
        Row: {
          denumire: string
          id: string
          observatii: string | null
          order_index: number
          parametri: Json | null
          praguri: Json
          puncte_max: number
          rubrica_id: string
          slug: string
          strat: string
          verificator: string | null
        }
        Insert: {
          denumire: string
          id?: string
          observatii?: string | null
          order_index?: number
          parametri?: Json | null
          praguri?: Json
          puncte_max: number
          rubrica_id: string
          slug: string
          strat: string
          verificator?: string | null
        }
        Update: {
          denumire?: string
          id?: string
          observatii?: string | null
          order_index?: number
          parametri?: Json | null
          praguri?: Json
          puncte_max?: number
          rubrica_id?: string
          slug?: string
          strat?: string
          verificator?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barem_criterii_rubrica_id_fkey"
            columns: ["rubrica_id"]
            isOneToOne: false
            referencedRelation: "barem_rubrici"
            referencedColumns: ["id"]
          },
        ]
      }
      barem_rubrici: {
        Row: {
          denumire: string
          id: string
          minim_cuvinte: number | null
          observatii: string | null
          order_index: number
          profil: string | null
          puncte_total: number
          slug: string
          subiect: string
          version_id: string
        }
        Insert: {
          denumire: string
          id?: string
          minim_cuvinte?: number | null
          observatii?: string | null
          order_index?: number
          profil?: string | null
          puncte_total: number
          slug: string
          subiect: string
          version_id: string
        }
        Update: {
          denumire?: string
          id?: string
          minim_cuvinte?: number | null
          observatii?: string | null
          order_index?: number
          profil?: string | null
          puncte_total?: number
          slug?: string
          subiect?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barem_rubrici_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "barem_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      barem_versions: {
        Row: {
          checksum: string
          created_at: string
          id: string
          is_active: boolean
          sursa: string
          versiune_document: string
        }
        Insert: {
          checksum: string
          created_at?: string
          id?: string
          is_active?: boolean
          sursa: string
          versiune_document: string
        }
        Update: {
          checksum?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sursa?: string
          versiune_document?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_free: boolean
          order_index: number
          published: boolean
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean
          order_index?: number
          published?: boolean
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean
          order_index?: number
          published?: boolean
          title?: string
        }
        Relationships: []
      }
      concept_states: {
        Row: {
          difficulty: number
          due: string
          elapsed_days: number
          lapses: number
          last_review: string | null
          learning_steps: number
          reps: number
          scheduled_days: number
          stability: number
          state: number
          tag_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          difficulty?: number
          due: string
          elapsed_days?: number
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: number
          tag_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          difficulty?: number
          due?: string
          elapsed_days?: number
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: number
          tag_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_states_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string | null
          source: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string | null
          source?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string | null
          source?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          chapter_id: string
          content: string | null
          created_at: string
          id: string
          order_index: number
          published: boolean
          title: string
          video_url: string | null
        }
        Insert: {
          chapter_id: string
          content?: string | null
          created_at?: string
          id?: string
          order_index?: number
          published?: boolean
          title: string
          video_url?: string | null
        }
        Update: {
          chapter_id?: string
          content?: string | null
          created_at?: string
          id?: string
          order_index?: number
          published?: boolean
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_events: {
        Row: {
          event_id: string
          processed_at: string
          type: string | null
        }
        Insert: {
          event_id: string
          processed_at?: string
          type?: string | null
        }
        Update: {
          event_id?: string
          processed_at?: string
          type?: string | null
        }
        Relationships: []
      }
      question_tags: {
        Row: {
          question_id: string
          tag_id: string
        }
        Insert: {
          question_id: string
          tag_id: string
        }
        Update: {
          question_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          chapter_id: string
          created_at: string
          explanation: string | null
          id: string
          order_index: number
          published: boolean
          text: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          explanation?: string | null
          id?: string
          order_index?: number
          published?: boolean
          text: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          explanation?: string | null
          id?: string
          order_index?: number
          published?: boolean
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          attempts: number
          chapter_id: string
          completed_at: string
          id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          attempts?: number
          chapter_id: string
          completed_at?: string
          id?: string
          score?: number
          total?: number
          user_id: string
        }
        Update: {
          attempts?: number
          chapter_id?: string
          completed_at?: string
          id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          axis: string
          created_at: string
          id: string
          name: string
          profile: string | null
          slug: string
        }
        Insert: {
          axis: string
          created_at?: string
          id?: string
          name: string
          profile?: string | null
          slug: string
        }
        Update: {
          axis?: string
          created_at?: string
          id?: string
          name?: string
          profile?: string | null
          slug?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          author_id: string | null
          author_role: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_role?: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          chapter_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          lesson_id: string | null
          lesson_title: string | null
          message: string
          progress_attempts: number | null
          progress_score: number | null
          progress_total: number | null
          scroll_percent: number | null
          selection: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          lesson_id?: string | null
          lesson_title?: string | null
          message: string
          progress_attempts?: number | null
          progress_score?: number | null
          progress_total?: number | null
          scroll_percent?: number | null
          selection?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          lesson_id?: string | null
          lesson_title?: string | null
          message?: string
          progress_attempts?: number | null
          progress_score?: number | null
          progress_total?: number | null
          scroll_percent?: number | null
          selection?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trialuri_consumate: {
        Row: {
          clerk_id: string | null
          consumat_la: string
          email_normalizat: string
          stripe_subscription_id: string | null
        }
        Insert: {
          clerk_id?: string | null
          consumat_la?: string
          email_normalizat: string
          stripe_subscription_id?: string | null
        }
        Update: {
          clerk_id?: string | null
          consumat_la?: string
          email_normalizat?: string
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          clerk_id: string
          created_at: string
          email: string
          email_normalizat: string | null
          full_name: string | null
          id: string
          role: string
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_status: string
          updated_at: string
        }
        Insert: {
          clerk_id: string
          created_at?: string
          email: string
          email_normalizat?: string | null
          full_name?: string | null
          id: string
          role?: string
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          clerk_id?: string
          created_at?: string
          email?: string
          email_normalizat?: string | null
          full_name?: string | null
          id?: string
          role?: string
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      latest_answer_per_question: {
        Row: {
          chapter_id: string | null
          chosen_answer_id: string | null
          created_at: string | null
          is_correct: boolean | null
          question_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_events_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_events_chosen_answer_id_fkey"
            columns: ["chosen_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_events_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      question_difficulty: {
        Row: {
          question_id: string | null
          students: number | null
          wrong: number | null
          wrong_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_events_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
