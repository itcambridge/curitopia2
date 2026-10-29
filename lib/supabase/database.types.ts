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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      concept_questions: {
        Row: {
          concept_id: string
          considered_text_snapshot: string | null
          created_at: string
          curiosity_id: string
          id: string
          original_text_snapshot: string
          question_id: string | null
          user_id: string
        }
        Insert: {
          concept_id: string
          considered_text_snapshot?: string | null
          created_at?: string
          curiosity_id: string
          id: string
          original_text_snapshot: string
          question_id?: string | null
          user_id: string
        }
        Update: {
          concept_id?: string
          considered_text_snapshot?: string | null
          created_at?: string
          curiosity_id?: string
          id?: string
          original_text_snapshot?: string
          question_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_questions_concept_owner"
            columns: ["concept_id", "user_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "concept_questions_concept_curiosity"
            columns: ["concept_id", "user_id", "curiosity_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id", "user_id", "curiosity_id"]
          },
          {
            foreignKeyName: "concept_questions_question_owner"
            columns: ["question_id", "user_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "concept_questions_question_curiosity"
            columns: ["question_id", "user_id", "curiosity_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "user_id", "curiosity_id"]
          },
        ]
      }
      concepts: {
        Row: {
          created_at: string
          curiosity_id: string
          for_considered_text: string
          id: string
          image_model: string
          image_path: string
          prompt_version: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          curiosity_id: string
          for_considered_text: string
          id: string
          image_model: string
          image_path: string
          prompt_version: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          curiosity_id?: string
          for_considered_text?: string
          id?: string
          image_model?: string
          image_path?: string
          prompt_version?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_curiosity_owner"
            columns: ["curiosity_id", "user_id"]
            isOneToOne: false
            referencedRelation: "curiosities"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      curiosities: {
        Row: {
          created_at: string
          id: string
          name: string
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          considered_text: string | null
          created_at: string
          curiosity_id: string
          disposition: string
          id: string
          merged_into_id: string | null
          original_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          considered_text?: string | null
          created_at?: string
          curiosity_id: string
          disposition?: string
          id: string
          merged_into_id?: string | null
          original_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          considered_text?: string | null
          created_at?: string
          curiosity_id?: string
          disposition?: string
          id?: string
          merged_into_id?: string | null
          original_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_curiosity_owner"
            columns: ["curiosity_id", "user_id"]
            isOneToOne: false
            referencedRelation: "curiosities"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "questions_merge_same_owner"
            columns: ["merged_into_id", "user_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "questions_merge_same_curiosity"
            columns: ["merged_into_id", "user_id", "curiosity_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "user_id", "curiosity_id"]
          },
        ]
      }
      theme_questions: {
        Row: {
          created_at: string
          position: number
          question_id: string
          theme_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          position?: number
          question_id: string
          theme_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          position?: number
          question_id?: string
          theme_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_questions_question_owner"
            columns: ["question_id", "user_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "theme_questions_theme_owner"
            columns: ["theme_id", "user_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      themes: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      questions_merge_lock: {
        Args: { target_user: string }
        Returns: undefined
      }
      reserve_ai_request: {
        Args: { p_endpoint: string }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
