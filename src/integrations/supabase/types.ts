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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automation_runs: {
        Row: {
          candidates_found: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          log_data: Json | null
          run_type: string
          selected_bucket: string | null
          selected_keyword: string | null
          started_at: string
          status: string
        }
        Insert: {
          candidates_found?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          log_data?: Json | null
          run_type: string
          selected_bucket?: string | null
          selected_keyword?: string | null
          started_at?: string
          status: string
        }
        Update: {
          candidates_found?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          log_data?: Json | null
          run_type?: string
          selected_bucket?: string | null
          selected_keyword?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          images: Json | null
          keywords: string[] | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_directives: {
        Row: {
          created_at: string
          created_by_visitor_token: string | null
          directive: string
          expires_at: string | null
          id: string
          is_active: boolean
          source: string
        }
        Insert: {
          created_at?: string
          created_by_visitor_token?: string | null
          directive: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          source?: string
        }
        Update: {
          created_at?: string
          created_by_visitor_token?: string | null
          directive?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          source?: string
        }
        Relationships: []
      }
      chat_insights: {
        Row: {
          best_answer: string | null
          created_at: string
          follow_up_topics: string[] | null
          id: string
          intent: string
          language: string | null
          last_seen_at: string | null
          occurrence_count: number | null
          question_pattern: string
          topic: string
        }
        Insert: {
          best_answer?: string | null
          created_at?: string
          follow_up_topics?: string[] | null
          id?: string
          intent: string
          language?: string | null
          last_seen_at?: string | null
          occurrence_count?: number | null
          question_pattern: string
          topic: string
        }
        Update: {
          best_answer?: string | null
          created_at?: string
          follow_up_topics?: string[] | null
          id?: string
          intent?: string
          language?: string | null
          last_seen_at?: string | null
          occurrence_count?: number | null
          question_pattern?: string
          topic?: string
        }
        Relationships: []
      }
      chat_visitors: {
        Row: {
          conversation_count: number
          email: string | null
          first_seen_at: string
          id: string
          last_booking_context: Json | null
          last_seen_at: string
          name: string | null
          phone: string | null
          summary: string | null
          updated_at: string
          visitor_token: string
        }
        Insert: {
          conversation_count?: number
          email?: string | null
          first_seen_at?: string
          id?: string
          last_booking_context?: Json | null
          last_seen_at?: string
          name?: string | null
          phone?: string | null
          summary?: string | null
          updated_at?: string
          visitor_token: string
        }
        Update: {
          conversation_count?: number
          email?: string | null
          first_seen_at?: string
          id?: string
          last_booking_context?: Json | null
          last_seen_at?: string
          name?: string | null
          phone?: string | null
          summary?: string | null
          updated_at?: string
          visitor_token?: string
        }
        Relationships: []
      }
      emotion_gaps: {
        Row: {
          created_at: string
          emotion_name: string
          first_seen_at: string
          id: string
          last_seen_at: string
          notified: boolean
          occurrence_count: number
          sample_contexts: string[] | null
        }
        Insert: {
          created_at?: string
          emotion_name: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          notified?: boolean
          occurrence_count?: number
          sample_contexts?: string[] | null
        }
        Update: {
          created_at?: string
          emotion_name?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          notified?: boolean
          occurrence_count?: number
          sample_contexts?: string[] | null
        }
        Relationships: []
      }
      evergreen_topics: {
        Row: {
          bucket: string
          created_at: string
          id: string
          internal_link_focus: string
          is_active: boolean
          keyword_norm: string | null
          last_used_at: string | null
          primary_keyword: string
          seed_phrases: Json
          title_ideas: Json
          use_count: number
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          internal_link_focus: string
          is_active?: boolean
          keyword_norm?: string | null
          last_used_at?: string | null
          primary_keyword: string
          seed_phrases?: Json
          title_ideas?: Json
          use_count?: number
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          internal_link_focus?: string
          is_active?: boolean
          keyword_norm?: string | null
          last_used_at?: string | null
          primary_keyword?: string
          seed_phrases?: Json
          title_ideas?: Json
          use_count?: number
        }
        Relationships: []
      }
      guest_reviews: {
        Row: {
          created_at: string
          id: string
          is_featured: boolean
          language: string | null
          platform: string
          rating: number | null
          review_date: string | null
          review_hash: string
          review_text: string
          reviewer_name: string | null
          scraped_at: string
          tags: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_featured?: boolean
          language?: string | null
          platform?: string
          rating?: number | null
          review_date?: string | null
          review_hash: string
          review_text: string
          reviewer_name?: string | null
          scraped_at?: string
          tags?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          is_featured?: boolean
          language?: string | null
          platform?: string
          rating?: number | null
          review_date?: string | null
          review_hash?: string
          review_text?: string
          reviewer_name?: string | null
          scraped_at?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      ops_audit_log: {
        Row: {
          action: string
          after_json: Json | null
          before_json: Json | null
          branch_id: string
          entity_id: string
          entity_type: string
          id: string
          performed_at: string
          performed_by: string
        }
        Insert: {
          action: string
          after_json?: Json | null
          before_json?: Json | null
          branch_id: string
          entity_id: string
          entity_type: string
          id?: string
          performed_at?: string
          performed_by: string
        }
        Update: {
          action?: string
          after_json?: Json | null
          before_json?: Json | null
          branch_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          performed_at?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_audit_log_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_branches: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ops_config_registry: {
        Row: {
          branch_id: string
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value_json: Json
        }
        Insert: {
          branch_id: string
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value_json?: Json
        }
        Update: {
          branch_id?: string
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ops_config_registry_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_rooms: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          room_type: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id: string
          is_active?: boolean
          room_type: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          room_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_user_profiles: {
        Row: {
          branch_id: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          preferred_language: string
          role: Database["public"]["Enums"]["ops_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          preferred_language?: string
          role?: Database["public"]["Enums"]["ops_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          preferred_language?: string
          role?: Database["public"]["Enums"]["ops_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_user_profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      post_history: {
        Row: {
          blog_post_id: string | null
          bucket: string
          created_at: string
          id: string
          keyword_norm: string | null
          post_type: string
          primary_keyword: string
          publish_date: string
          publish_day: string
          selection_meta: Json | null
          theme_id: string | null
          title: string
          url: string | null
        }
        Insert: {
          blog_post_id?: string | null
          bucket: string
          created_at?: string
          id?: string
          keyword_norm?: string | null
          post_type: string
          primary_keyword: string
          publish_date: string
          publish_day: string
          selection_meta?: Json | null
          theme_id?: string | null
          title: string
          url?: string | null
        }
        Update: {
          blog_post_id?: string | null
          bucket?: string
          created_at?: string
          id?: string
          keyword_norm?: string | null
          post_type?: string
          primary_keyword?: string
          publish_date?: string
          publish_day?: string
          selection_meta?: Json | null
          theme_id?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_history_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_calendar: {
        Row: {
          active_from_mmdd: string
          active_to_mmdd: string
          bucket: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          seed_phrases: Json
          theme_id: string
        }
        Insert: {
          active_from_mmdd: string
          active_to_mmdd: string
          bucket: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          seed_phrases?: Json
          theme_id: string
        }
        Update: {
          active_from_mmdd?: string
          active_to_mmdd?: string
          bucket?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          seed_phrases?: Json
          theme_id?: string
        }
        Relationships: []
      }
      serp_scores: {
        Row: {
          content_gap_score: number
          created_at: string
          expires_at: string
          id: string
          intent_score: number
          keyword: string
          local_fit_score: number
          locale: string | null
          provider: string | null
          rankability_score: number
          raw_serp_data: Json | null
          top_10_domains: Json | null
          total_score: number
        }
        Insert: {
          content_gap_score?: number
          created_at?: string
          expires_at?: string
          id?: string
          intent_score?: number
          keyword: string
          local_fit_score?: number
          locale?: string | null
          provider?: string | null
          rankability_score?: number
          raw_serp_data?: Json | null
          top_10_domains?: Json | null
          total_score?: number
        }
        Update: {
          content_gap_score?: number
          created_at?: string
          expires_at?: string
          id?: string
          intent_score?: number
          keyword?: string
          local_fit_score?: number
          locale?: string | null
          provider?: string | null
          rankability_score?: number
          raw_serp_data?: Json | null
          top_10_domains?: Json | null
          total_score?: number
        }
        Relationships: []
      }
      trend_candidates: {
        Row: {
          candidate_keyword: string
          created_at: string
          first_seen_at: string | null
          geo: string
          id: string
          interest_12m: number | null
          interest_90d: number | null
          is_processed: boolean
          is_relevant: boolean | null
          keyword_norm: string | null
          keyword_raw: string | null
          last_pytrends_meta: Json | null
          last_seen_at: string | null
          query_type: string
          raw_data: Json | null
          relevance_score: number | null
          seed_keyword: string
          seeds: Json | null
          seen_count: number | null
          source: string
          source_type: string | null
        }
        Insert: {
          candidate_keyword: string
          created_at?: string
          first_seen_at?: string | null
          geo?: string
          id?: string
          interest_12m?: number | null
          interest_90d?: number | null
          is_processed?: boolean
          is_relevant?: boolean | null
          keyword_norm?: string | null
          keyword_raw?: string | null
          last_pytrends_meta?: Json | null
          last_seen_at?: string | null
          query_type: string
          raw_data?: Json | null
          relevance_score?: number | null
          seed_keyword: string
          seeds?: Json | null
          seen_count?: number | null
          source: string
          source_type?: string | null
        }
        Update: {
          candidate_keyword?: string
          created_at?: string
          first_seen_at?: string | null
          geo?: string
          id?: string
          interest_12m?: number | null
          interest_90d?: number | null
          is_processed?: boolean
          is_relevant?: boolean | null
          keyword_norm?: string | null
          keyword_raw?: string | null
          last_pytrends_meta?: Json | null
          last_seen_at?: string | null
          query_type?: string
          raw_data?: Json | null
          relevance_score?: number | null
          seed_keyword?: string
          seeds?: Json | null
          seen_count?: number | null
          source?: string
          source_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ops_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["ops_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ops_user_branch_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      ops_role: "manager" | "admin"
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
      ops_role: ["manager", "admin"],
    },
  },
} as const
