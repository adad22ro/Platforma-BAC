// Tipurile tabelelor din Supabase (schema `public`).
// Folosite de clienții din lib/supabase.ts și lib/supabase-admin.ts ca query-urile
// să fie tipate (fără cast-uri manuale `as UserRow`).
//
// Regenerare după modificarea schemei: `npm run db:types` (vezi supabase/README.md).
// Format compatibil cu output-ul `supabase gen types typescript`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          clerk_id: string | null;
          email: string;
          full_name: string | null;
          role: string;
          subscription_status: string;
          stripe_customer_id: string | null;
          subscription_end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_id?: string | null;
          email: string;
          full_name?: string | null;
          role?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          subscription_end_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_id?: string | null;
          email?: string;
          full_name?: string | null;
          role?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          subscription_end_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      error_logs: {
        Row: {
          id: string;
          source: string | null;
          message: string | null;
          context: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source?: string | null;
          message?: string | null;
          context?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          source?: string | null;
          message?: string | null;
          context?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      processed_events: {
        Row: {
          event_id: string;
          type: string | null;
          processed_at: string;
        };
        Insert: {
          event_id: string;
          type?: string | null;
          processed_at?: string;
        };
        Update: {
          event_id?: string;
          type?: string | null;
          processed_at?: string;
        };
        Relationships: [];
      };
      chapters: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          order_index: number;
          is_free: boolean;
          published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          order_index?: number;
          is_free?: boolean;
          published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          is_free?: boolean;
          published?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          chapter_id: string;
          title: string;
          content: string | null;
          video_url: string | null;
          order_index: number;
          published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          title: string;
          content?: string | null;
          video_url?: string | null;
          order_index?: number;
          published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          chapter_id?: string;
          title?: string;
          content?: string | null;
          video_url?: string | null;
          order_index?: number;
          published?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
