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
      ops_daily_reports: {
        Row: {
          branch_id: string
          created_at: string
          general_notes: string | null
          highlights: string | null
          id: string
          issues: string | null
          kitchen_notes: string | null
          maintenance_notes: string | null
          occupancy_notes: string | null
          report_date: string
          revenue_cash: number | null
          revenue_online: number | null
          revenue_total: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          general_notes?: string | null
          highlights?: string | null
          id?: string
          issues?: string | null
          kitchen_notes?: string | null
          maintenance_notes?: string | null
          occupancy_notes?: string | null
          report_date: string
          revenue_cash?: number | null
          revenue_online?: number | null
          revenue_total?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          general_notes?: string | null
          highlights?: string | null
          id?: string
          issues?: string | null
          kitchen_notes?: string | null
          maintenance_notes?: string | null
          occupancy_notes?: string | null
          report_date?: string
          revenue_cash?: number | null
          revenue_online?: number | null
          revenue_total?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_daily_reports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_guest_log: {
        Row: {
          address: string | null
          adults: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          arriving_from: string | null
          branch_id: string
          check_in_at: string
          check_out_at: string | null
          check_out_by: string | null
          checked_in_by: string
          children: number
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          evisa_number: string | null
          expected_check_in: string | null
          expected_check_out: string | null
          guest_name: string
          guest_type: string
          heading_to: string | null
          id: string
          id_proof_type: string | null
          id_proof_url: string | null
          nationality: string | null
          notes: string | null
          number_of_nights: number | null
          passport_number: string | null
          payment_mode: string | null
          phone: string | null
          pincode: string | null
          purpose: string | null
          room_id: string | null
          share_token: string | null
          source: string | null
          state: string | null
          status: string
          submission_source: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          adults?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          arriving_from?: string | null
          branch_id: string
          check_in_at?: string
          check_out_at?: string | null
          check_out_by?: string | null
          checked_in_by: string
          children?: number
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          evisa_number?: string | null
          expected_check_in?: string | null
          expected_check_out?: string | null
          guest_name: string
          guest_type?: string
          heading_to?: string | null
          id?: string
          id_proof_type?: string | null
          id_proof_url?: string | null
          nationality?: string | null
          notes?: string | null
          number_of_nights?: number | null
          passport_number?: string | null
          payment_mode?: string | null
          phone?: string | null
          pincode?: string | null
          purpose?: string | null
          room_id?: string | null
          share_token?: string | null
          source?: string | null
          state?: string | null
          status?: string
          submission_source?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          adults?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          arriving_from?: string | null
          branch_id?: string
          check_in_at?: string
          check_out_at?: string | null
          check_out_by?: string | null
          checked_in_by?: string
          children?: number
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          evisa_number?: string | null
          expected_check_in?: string | null
          expected_check_out?: string | null
          guest_name?: string
          guest_type?: string
          heading_to?: string | null
          id?: string
          id_proof_type?: string | null
          id_proof_url?: string | null
          nationality?: string | null
          notes?: string | null
          number_of_nights?: number | null
          passport_number?: string | null
          payment_mode?: string | null
          phone?: string | null
          pincode?: string | null
          purpose?: string | null
          room_id?: string | null
          share_token?: string | null
          source?: string | null
          state?: string | null
          status?: string
          submission_source?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_guest_log_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_guest_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "ops_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_inventory_expiry: {
        Row: {
          batch_label: string | null
          branch_id: string
          created_at: string
          disposed_at: string | null
          disposed_by: string | null
          expiry_date: string
          id: string
          is_disposed: boolean
          item_id: string
          mfg_date: string | null
          quantity: number
          received_date: string | null
        }
        Insert: {
          batch_label?: string | null
          branch_id: string
          created_at?: string
          disposed_at?: string | null
          disposed_by?: string | null
          expiry_date: string
          id?: string
          is_disposed?: boolean
          item_id: string
          mfg_date?: string | null
          quantity?: number
          received_date?: string | null
        }
        Update: {
          batch_label?: string | null
          branch_id?: string
          created_at?: string
          disposed_at?: string | null
          disposed_by?: string | null
          expiry_date?: string
          id?: string
          is_disposed?: boolean
          item_id?: string
          mfg_date?: string | null
          quantity?: number
          received_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_inventory_expiry_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_inventory_expiry_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ops_inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_inventory_items: {
        Row: {
          branch_id: string
          category: string
          created_at: string
          current_stock: number
          expiry_warn_days: number | null
          id: string
          is_active: boolean
          last_received_at: string | null
          mfg_offset_days: number
          name_en: string
          name_ml: string | null
          par_level: number
          reorder_point: number
          unit: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          category?: string
          created_at?: string
          current_stock?: number
          expiry_warn_days?: number | null
          id?: string
          is_active?: boolean
          last_received_at?: string | null
          mfg_offset_days?: number
          name_en: string
          name_ml?: string | null
          par_level?: number
          reorder_point?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          category?: string
          created_at?: string
          current_stock?: number
          expiry_warn_days?: number | null
          id?: string
          is_active?: boolean
          last_received_at?: string | null
          mfg_offset_days?: number
          name_en?: string
          name_ml?: string | null
          par_level?: number
          reorder_point?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_inventory_transactions: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          item_id: string
          notes: string | null
          performed_by: string
          quantity: number
          related_order_id: string | null
          type: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          performed_by: string
          quantity: number
          related_order_id?: string | null
          type?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          performed_by?: string
          quantity?: number
          related_order_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_inventory_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ops_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_inventory_transactions_order_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "ops_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_laundry_batches: {
        Row: {
          actual_return_at: string | null
          branch_id: string
          created_at: string
          expected_return_at: string
          id: string
          notes: string | null
          received_by: string | null
          sent_at: string
          sent_before_noon: boolean
          sent_by: string
          sets_count: number
          status: string
        }
        Insert: {
          actual_return_at?: string | null
          branch_id: string
          created_at?: string
          expected_return_at: string
          id?: string
          notes?: string | null
          received_by?: string | null
          sent_at?: string
          sent_before_noon?: boolean
          sent_by: string
          sets_count?: number
          status?: string
        }
        Update: {
          actual_return_at?: string | null
          branch_id?: string
          created_at?: string
          expected_return_at?: string
          id?: string
          notes?: string | null
          received_by?: string | null
          sent_at?: string
          sent_before_noon?: boolean
          sent_by?: string
          sets_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_laundry_batches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_notifications: {
        Row: {
          action_url: string | null
          body: string | null
          branch_id: string
          created_at: string
          id: string
          is_read: boolean
          related_reminder_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          branch_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_reminder_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          branch_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_reminder_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_notifications_related_reminder_id_fkey"
            columns: ["related_reminder_id"]
            isOneToOne: false
            referencedRelation: "ops_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_purchase_order_items: {
        Row: {
          added_by: string | null
          branch_id: string
          completed_at: string | null
          completed_by: string | null
          id: string
          item_id: string
          order_id: string
          quantity: number
          received_quantity: number | null
          unit_price: number | null
        }
        Insert: {
          added_by?: string | null
          branch_id: string
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          item_id: string
          order_id: string
          quantity?: number
          received_quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          added_by?: string | null
          branch_id?: string
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          item_id?: string
          order_id?: string
          quantity?: number
          received_quantity?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_purchase_order_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ops_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ops_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_purchase_orders: {
        Row: {
          approved_by: string | null
          branch_id: string
          created_at: string
          id: string
          ordered_at: string | null
          receive_notes: string | null
          receive_proof_url: string | null
          received_at: string | null
          requested_by: string
          status: string
          total_amount: number | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          approved_by?: string | null
          branch_id: string
          created_at?: string
          id?: string
          ordered_at?: string | null
          receive_notes?: string | null
          receive_proof_url?: string | null
          received_at?: string | null
          requested_by: string
          status?: string
          total_amount?: number | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          approved_by?: string | null
          branch_id?: string
          created_at?: string
          id?: string
          ordered_at?: string | null
          receive_notes?: string | null
          receive_proof_url?: string | null
          received_at?: string | null
          requested_by?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_purchase_templates: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          items_json: Json
          name: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          items_json?: Json
          name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          items_json?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_purchase_templates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_reminders: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          description: string | null
          fire_count: number
          follow_up_response: string | null
          follow_up_status: string | null
          id: string
          last_fired_at: string | null
          next_fire_at: string
          recurrence_rule: Json | null
          reminder_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          description?: string | null
          fire_count?: number
          follow_up_response?: string | null
          follow_up_status?: string | null
          id?: string
          last_fired_at?: string | null
          next_fire_at: string
          recurrence_rule?: Json | null
          reminder_type?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          fire_count?: number
          follow_up_response?: string | null
          follow_up_status?: string | null
          id?: string
          last_fired_at?: string | null
          next_fire_at?: string
          recurrence_rule?: Json | null
          reminder_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_reminders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_room_refill_templates: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          item_id: string
          quantity: number
          room_type: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_id: string
          quantity?: number
          room_type: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_id?: string
          quantity?: number
          room_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_room_refill_templates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_room_refill_templates_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ops_inventory_items"
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
      ops_shift_breaks: {
        Row: {
          branch_id: string
          break_end: string | null
          break_start: string
          break_type: string
          id: string
          shift_id: string
        }
        Insert: {
          branch_id: string
          break_end?: string | null
          break_start?: string
          break_type?: string
          id?: string
          shift_id: string
        }
        Update: {
          branch_id?: string
          break_end?: string | null
          break_start?: string
          break_type?: string
          id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_shift_breaks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_shift_breaks_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "ops_shift_punches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_shift_punches: {
        Row: {
          branch_id: string
          clock_in_at: string
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_out_at: string | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          created_at: string
          flag_reason: string | null
          flag_type: string | null
          id: string
          notes: string | null
          status: string
          total_break_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          clock_in_at?: string
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out_at?: string | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string
          flag_reason?: string | null
          flag_type?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_break_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          clock_in_at?: string
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out_at?: string | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string
          flag_reason?: string | null
          flag_type?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_break_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_shift_punches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_task_attachments: {
        Row: {
          amount: number | null
          bill_date: string | null
          branch_id: string
          file_url: string
          id: string
          metadata_json: Json | null
          photo_device: string | null
          photo_lat: number | null
          photo_lng: number | null
          photo_taken_at: string | null
          tags: string[] | null
          task_id: string
          type: string
          upload_timestamp: string | null
          uploaded_at: string
          uploaded_by: string
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          bill_date?: string | null
          branch_id: string
          file_url: string
          id?: string
          metadata_json?: Json | null
          photo_device?: string | null
          photo_lat?: number | null
          photo_lng?: number | null
          photo_taken_at?: string | null
          tags?: string[] | null
          task_id: string
          type?: string
          upload_timestamp?: string | null
          uploaded_at?: string
          uploaded_by: string
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          bill_date?: string | null
          branch_id?: string
          file_url?: string
          id?: string
          metadata_json?: Json | null
          photo_device?: string | null
          photo_lat?: number | null
          photo_lng?: number | null
          photo_taken_at?: string | null
          tags?: string[] | null
          task_id?: string
          type?: string
          upload_timestamp?: string | null
          uploaded_at?: string
          uploaded_by?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_task_attachments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ops_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_task_library: {
        Row: {
          branch_id: string
          category: string
          created_at: string
          created_by: string
          default_assignees: string[] | null
          default_due_rule_json: Json | null
          default_priority: string
          description_en: string | null
          id: string
          is_active: boolean
          proof_required_default: boolean
          receipt_required_default: boolean
          title_en: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          category?: string
          created_at?: string
          created_by: string
          default_assignees?: string[] | null
          default_due_rule_json?: Json | null
          default_priority?: string
          description_en?: string | null
          id?: string
          is_active?: boolean
          proof_required_default?: boolean
          receipt_required_default?: boolean
          title_en: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          category?: string
          created_at?: string
          created_by?: string
          default_assignees?: string[] | null
          default_due_rule_json?: Json | null
          default_priority?: string
          description_en?: string | null
          id?: string
          is_active?: boolean
          proof_required_default?: boolean
          receipt_required_default?: boolean
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_task_library_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_tasks: {
        Row: {
          assigned_to: string[]
          blocked_reason_code: string | null
          blocked_reason_text_en: string | null
          blocked_reason_text_ml: string | null
          blocked_reason_text_original: string | null
          branch_id: string
          category: string
          completion_notes_en: string | null
          completion_notes_ml: string | null
          completion_notes_original: string | null
          created_at: string
          created_by: string
          description_en: string | null
          description_ml: string | null
          description_original: string | null
          due_datetime: string | null
          id: string
          original_language: string
          priority: string
          proof_required: boolean
          receipt_required: boolean
          related_inventory_item_id: string | null
          related_room_id: string | null
          status: string
          tags: string[] | null
          template_id: string | null
          title_en: string | null
          title_ml: string | null
          title_original: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string[]
          blocked_reason_code?: string | null
          blocked_reason_text_en?: string | null
          blocked_reason_text_ml?: string | null
          blocked_reason_text_original?: string | null
          branch_id: string
          category?: string
          completion_notes_en?: string | null
          completion_notes_ml?: string | null
          completion_notes_original?: string | null
          created_at?: string
          created_by: string
          description_en?: string | null
          description_ml?: string | null
          description_original?: string | null
          due_datetime?: string | null
          id?: string
          original_language?: string
          priority?: string
          proof_required?: boolean
          receipt_required?: boolean
          related_inventory_item_id?: string | null
          related_room_id?: string | null
          status?: string
          tags?: string[] | null
          template_id?: string | null
          title_en?: string | null
          title_ml?: string | null
          title_original: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string[]
          blocked_reason_code?: string | null
          blocked_reason_text_en?: string | null
          blocked_reason_text_ml?: string | null
          blocked_reason_text_original?: string | null
          branch_id?: string
          category?: string
          completion_notes_en?: string | null
          completion_notes_ml?: string | null
          completion_notes_original?: string | null
          created_at?: string
          created_by?: string
          description_en?: string | null
          description_ml?: string | null
          description_original?: string | null
          due_datetime?: string | null
          id?: string
          original_language?: string
          priority?: string
          proof_required?: boolean
          receipt_required?: boolean
          related_inventory_item_id?: string | null
          related_room_id?: string | null
          status?: string
          tags?: string[] | null
          template_id?: string | null
          title_en?: string | null
          title_ml?: string | null
          title_original?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "ops_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_tasks_related_room_id_fkey"
            columns: ["related_room_id"]
            isOneToOne: false
            referencedRelation: "ops_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ops_task_library"
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
      ops_vector_knowledge: {
        Row: {
          branch_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          topic: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          topic: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          topic?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_vector_knowledge_branch_id_fkey"
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
