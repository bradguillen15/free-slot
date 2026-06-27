export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          target_hours_per_week: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          target_hours_per_week?: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          target_hours_per_week?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          hidden: boolean
          id: string
          is_default: boolean
          name: string
          sort_order: number
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          hidden?: boolean
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          hidden?: boolean
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["category_type"]
          user_id?: string
        }
        Relationships: []
      }
      daily_notes: {
        Row: {
          content: Json
          date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inbox_items: {
        Row: {
          archived_at: string | null
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          include_weekends: boolean
          onboarding_completed: boolean
          onboarding_skipped: boolean
          peak_hours: Json | null
          time_format: string
          weekly_review_day: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          include_weekends?: boolean
          onboarding_completed?: boolean
          onboarding_skipped?: boolean
          peak_hours?: Json | null
          time_format?: string
          weekly_review_day?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          include_weekends?: boolean
          onboarding_completed?: boolean
          onboarding_skipped?: boolean
          peak_hours?: Json | null
          time_format?: string
          weekly_review_day?: number
        }
        Relationships: []
      }
      schedule_blocks: {
        Row: {
          category_id: string | null
          color: string
          created_at: string
          days_of_week: number[]
          end_time: string
          id: string
          name: string
          sort_order: number
          start_time: string
          type: Database["public"]["Enums"]["block_type"]
          user_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string
          created_at?: string
          days_of_week?: number[]
          end_time: string
          id?: string
          name: string
          sort_order?: number
          start_time: string
          type?: Database["public"]["Enums"]["block_type"]
          user_id: string
        }
        Update: {
          category_id?: string | null
          color?: string
          created_at?: string
          days_of_week?: number[]
          end_time?: string
          id?: string
          name?: string
          sort_order?: number
          start_time?: string
          type?: Database["public"]["Enums"]["block_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          category_id: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          note_json: Json | null
          notes: string | null
          start_time: string
          title: string | null
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          note_json?: Json | null
          notes?: string | null
          start_time: string
          title?: string | null
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          note_json?: Json | null
          notes?: string | null
          start_time?: string
          title?: string | null
          type?: Database["public"]["Enums"]["category_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          generated_at: string
          id: string
          slots: Json
          user_id: string
          week_start: string
        }
        Insert: {
          generated_at?: string
          id?: string
          slots?: Json
          user_id: string
          week_start: string
        }
        Update: {
          generated_at?: string
          id?: string
          slots?: Json
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_priorities: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          rank: number
          user_id: string
          week_start: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          rank: number
          user_id: string
          week_start: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          rank?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_priorities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          completed_at: string
          id: string
          insights: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          completed_at?: string
          id?: string
          insights?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          completed_at?: string
          id?: string
          insights?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      block_type: "fixed" | "waste_expected"
      category_type: "productive" | "unproductive" | "essential"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      block_type: ["fixed", "waste_expected"],
      category_type: ["productive", "unproductive", "essential"],
    },
  },
} as const

