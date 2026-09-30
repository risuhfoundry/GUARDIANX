// Types for the GUARDIAN X schema, generated from the live Supabase project
// (riscqxveytsnjdxnnije) via the Supabase MCP `generate_typescript_types` tool.
//
// These reflect the real deployed schema, which extends the pre-existing
// `profiles` / `classes` / `teacher_classes` architecture rather than
// redefining it. Teacher identity lives in `profiles` + `teacher_classes`;
// the dashboard reads teacher names through the `teacher_directory` view.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      classes: {
        Row: {
          archived_at: string | null
          created_at: string
          display_order: number
          id: string
          is_archived: boolean
          name: string
          section: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_archived?: boolean
          name: string
          section: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_archived?: boolean
          name?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      dismissal_requests: {
        Row: {
          guardian_id: string
          id: string
          requested_at: string
          status: string
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          guardian_id: string
          id: string
          requested_at?: string
          status?: string
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          guardian_id?: string
          id?: string
          requested_at?: string
          status?: string
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dismissal_requests_student_id_guardian_id_fkey"
            columns: ["student_id", "guardian_id"]
            isOneToOne: false
            referencedRelation: "student_guardians"
            referencedColumns: ["student_id", "guardian_id"]
          },
          {
            foreignKeyName: "dismissal_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          id: string
          name: string
          palm_id: string | null
          palm_status: string
        }
        Insert: {
          id: string
          name: string
          palm_id?: string | null
          palm_status?: string
        }
        Update: {
          id?: string
          name?: string
          palm_id?: string | null
          palm_status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      student_guardians: {
        Row: {
          guardian_id: string
          student_id: string
        }
        Insert: {
          guardian_id: string
          student_id: string
        }
        Update: {
          guardian_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_number: string
          class_id: string | null
          id: string
          name: string
        }
        Insert: {
          admission_number: string
          class_id?: string | null
          id: string
          name: string
        }
        Update: {
          admission_number?: string
          class_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_classes: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          teacher_profile_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          teacher_profile_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          teacher_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classes_teacher_profile_id_fkey"
            columns: ["teacher_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      class_directory: {
        Row: {
          display_order: number | null
          id: string | null
          name: string | null
          section: string | null
        }
        Relationships: []
      }
      teacher_directory: {
        Row: {
          class_id: string | null
          id: string | null
          name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      teacher_assigned_class_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      user_role: "SUPER_ADMIN" | "ADMIN" | "TEACHER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]

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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
    },
  },
} as const
