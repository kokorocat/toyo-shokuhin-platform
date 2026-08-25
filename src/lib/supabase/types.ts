export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      areas: {
        Row: {
          area_code: string
          block_id: string | null
          company_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          area_code: string
          block_id?: string | null
          company_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          area_code?: string
          block_id?: string | null
          company_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          id: string
          ip_address: string | null
          occurred_at: string
          system_code: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          id?: string
          ip_address?: string | null
          occurred_at?: string
          system_code: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          id?: string
          ip_address?: string | null
          occurred_at?: string
          system_code?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          block_code: string
          company_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          block_code: string
          company_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          block_code?: string
          company_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_orders: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          store_count: number
          target_description: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          store_count?: number
          target_description?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          store_count?: number
          target_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_code: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          company_code: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          ended_on: string | null
          id: string
          reason: string | null
          started_on: string
          store_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          ended_on?: string | null
          id?: string
          reason?: string | null
          started_on: string
          store_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          ended_on?: string | null
          id?: string
          reason?: string | null
          started_on?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_id: string
          created_at: string
          employee_code: string
          employment_type: string | null
          full_name: string
          hired_on: string | null
          id: string
          retired_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_code: string
          employment_type?: string | null
          full_name: string
          hired_on?: string | null
          id?: string
          retired_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_code?: string
          employment_type?: string | null
          full_name?: string
          hired_on?: string | null
          id?: string
          retired_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_employee_items: {
        Row: {
          action_taken: string | null
          answer: string
          id: string
          item_code: string
          note: string | null
          response_id: string
        }
        Insert: {
          action_taken?: string | null
          answer: string
          id?: string
          item_code: string
          note?: string | null
          response_id: string
        }
        Update: {
          action_taken?: string | null
          answer?: string
          id?: string
          item_code?: string
          note?: string | null
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_employee_items_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "haccp_employee_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_employee_responses: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string | null
          id: string
          is_unmatched: boolean
          manual_employee_code: string | null
          manual_name: string | null
          recorded_by: string
          store_id: string
          target_date: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id?: string | null
          id?: string
          is_unmatched?: boolean
          manual_employee_code?: string | null
          manual_name?: string | null
          recorded_by: string
          store_id: string
          target_date: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          is_unmatched?: boolean
          manual_employee_code?: string | null
          manual_name?: string | null
          recorded_by?: string
          store_id?: string
          target_date?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "haccp_employee_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_employee_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_employee_responses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_employee_responses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_inspection_items: {
        Row: {
          action_taken: string | null
          answer: string
          id: string
          inspection_id: string
          question_code: string
          reason: string | null
        }
        Insert: {
          action_taken?: string | null
          answer: string
          id?: string
          inspection_id: string
          question_code: string
          reason?: string | null
        }
        Update: {
          action_taken?: string | null
          answer?: string
          id?: string
          inspection_id?: string
          question_code?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haccp_inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "haccp_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_inspections: {
        Row: {
          company_id: string
          created_at: string
          hygiene_officer_name: string | null
          id: string
          implementer_name: string
          improvement_reason: string | null
          overall_evaluation: string
          recorded_by: string
          store_id: string
          store_manager_name: string | null
          submitted_on: string
          target_month: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          hygiene_officer_name?: string | null
          id?: string
          implementer_name: string
          improvement_reason?: string | null
          overall_evaluation: string
          recorded_by: string
          store_id: string
          store_manager_name?: string | null
          submitted_on?: string
          target_month: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          hygiene_officer_name?: string | null
          id?: string
          implementer_name?: string
          improvement_reason?: string | null
          overall_evaluation?: string
          recorded_by?: string
          store_id?: string
          store_manager_name?: string | null
          submitted_on?: string
          target_month?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "haccp_inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_inspections_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_inspections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_keypoint_items: {
        Row: {
          checked: boolean
          id: string
          item_code: string
          note: string | null
          response_id: string
        }
        Insert: {
          checked?: boolean
          id?: string
          item_code: string
          note?: string | null
          response_id: string
        }
        Update: {
          checked?: boolean
          id?: string
          item_code?: string
          note?: string | null
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_keypoint_items_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "haccp_keypoint_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_keypoint_responses: {
        Row: {
          company_id: string
          created_at: string
          id: string
          recorded_by: string
          store_id: string
          target_date: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          recorded_by: string
          store_id: string
          target_date: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          recorded_by?: string
          store_id?: string
          target_date?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "haccp_keypoint_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_keypoint_responses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_keypoint_responses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_temperature_labels: {
        Row: {
          id: string
          judgment: string | null
          label_type: string
          measured_value: number | null
          note: string | null
          response_id: string
        }
        Insert: {
          id?: string
          judgment?: string | null
          label_type: string
          measured_value?: number | null
          note?: string | null
          response_id: string
        }
        Update: {
          id?: string
          judgment?: string | null
          label_type?: string
          measured_value?: number | null
          note?: string | null
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_temperature_labels_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "haccp_keypoint_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_confirmations: {
        Row: {
          comment: string | null
          company_id: string
          confirmed_by: string
          confirmed_on: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          status: string
          store_id: string
          version: number
        }
        Insert: {
          comment?: string | null
          company_id: string
          confirmed_by: string
          confirmed_on?: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          period_type: string
          status?: string
          store_id: string
          version?: number
        }
        Update: {
          comment?: string | null
          company_id?: string
          confirmed_by?: string
          confirmed_on?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          status?: string
          store_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "manager_confirmations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_confirmations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_confirmations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_pages: {
        Row: {
          chapter_title: string | null
          id: string
          manual_version_id: string
          page_no: number
          page_title: string | null
          replacement_file_path: string | null
          status: string
        }
        Insert: {
          chapter_title?: string | null
          id?: string
          manual_version_id: string
          page_no: number
          page_title?: string | null
          replacement_file_path?: string | null
          status?: string
        }
        Update: {
          chapter_title?: string | null
          id?: string
          manual_version_id?: string
          page_no?: number
          page_title?: string | null
          replacement_file_path?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_pages_manual_version_id_fkey"
            columns: ["manual_version_id"]
            isOneToOne: false
            referencedRelation: "manual_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_scopes: {
        Row: {
          area_id: string | null
          company_id: string | null
          id: string
          manual_id: string
          scope_type: string
          store_id: string | null
        }
        Insert: {
          area_id?: string | null
          company_id?: string | null
          id?: string
          manual_id: string
          scope_type: string
          store_id?: string | null
        }
        Update: {
          area_id?: string | null
          company_id?: string | null
          id?: string
          manual_id?: string
          scope_type?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_scopes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_scopes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_scopes_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_scopes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          manual_id: string
          original_file_path: string
          published_at: string | null
          update_reason: string | null
          version_no: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          manual_id: string
          original_file_path: string
          published_at?: string | null
          update_reason?: string | null
          version_no: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          manual_id?: string
          original_file_path?: string
          published_at?: string | null
          update_reason?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_versions_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      manuals: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          current_version_id: string | null
          id: string
          is_deleted: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          id?: string
          is_deleted?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          id?: string
          is_deleted?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manuals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manuals_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "manual_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_reads: {
        Row: {
          id: string
          notice_id: string
          read_at: string
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          notice_id: string
          read_at?: string
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          notice_id?: string
          read_at?: string
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notice_reads_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "portal_notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_reads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_scopes: {
        Row: {
          area_id: string | null
          company_id: string | null
          id: string
          notice_id: string
          scope_type: string
          store_id: string | null
        }
        Insert: {
          area_id?: string | null
          company_id?: string | null
          id?: string
          notice_id: string
          scope_type: string
          store_id?: string | null
        }
        Update: {
          area_id?: string | null
          company_id?: string | null
          id?: string
          notice_id?: string
          scope_type?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notice_scopes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_scopes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_scopes_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "portal_notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_scopes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          created_at: string
          detail: Json
          id: string
          lot_size_snapshot: number
          memo: string | null
          order_id: string
          product_id: string | null
          product_name_snapshot: string
          product_type_snapshot: string
          quantity: number
          subtotal: number
          unit_price_snapshot: number
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          lot_size_snapshot?: number
          memo?: string | null
          order_id: string
          product_id?: string | null
          product_name_snapshot: string
          product_type_snapshot: string
          quantity: number
          subtotal: number
          unit_price_snapshot: number
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          lot_size_snapshot?: number
          memo?: string | null
          order_id?: string
          product_id?: string | null
          product_name_snapshot?: string
          product_type_snapshot?: string
          quantity?: number
          subtotal?: number
          unit_price_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_histories: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_histories_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billed: boolean
          bulk_order_id: string | null
          cancel_reason: string | null
          company_id: string
          created_at: string
          delivered_on: string | null
          delivery_date: string | null
          id: string
          memo: string | null
          order_number: string
          ordered_by: string
          shipped_on: string | null
          shipping_address: string | null
          shipping_fee: number
          shipping_method: string | null
          status: string
          store_id: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          billed?: boolean
          bulk_order_id?: string | null
          cancel_reason?: string | null
          company_id: string
          created_at?: string
          delivered_on?: string | null
          delivery_date?: string | null
          id?: string
          memo?: string | null
          order_number: string
          ordered_by: string
          shipped_on?: string | null
          shipping_address?: string | null
          shipping_fee?: number
          shipping_method?: string | null
          status?: string
          store_id: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          billed?: boolean
          bulk_order_id?: string | null
          cancel_reason?: string | null
          company_id?: string
          created_at?: string
          delivered_on?: string | null
          delivery_date?: string | null
          id?: string
          memo?: string | null
          order_number?: string
          ordered_by?: string
          shipped_on?: string | null
          shipping_address?: string | null
          shipping_fee?: number
          shipping_method?: string | null
          status?: string
          store_id?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_bulk_order_id_fkey"
            columns: ["bulk_order_id"]
            isOneToOne: false
            referencedRelation: "bulk_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_notices: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          display_end_at: string | null
          display_start_at: string
          external_url: string | null
          id: string
          importance: string
          is_deleted: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          display_end_at?: string | null
          display_start_at?: string
          external_url?: string | null
          id?: string
          importance?: string
          is_deleted?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          display_end_at?: string | null
          display_start_at?: string
          external_url?: string | null
          id?: string
          importance?: string
          is_deleted?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          job_type: string
          progress_percent: number
          retry_count: number
          started_at: string | null
          status: string
          target_id: string
          target_table: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_type: string
          progress_percent?: number
          retry_count?: number
          started_at?: string | null
          status?: string
          target_id: string
          target_table: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          progress_percent?: number
          retry_count?: number
          started_at?: string | null
          status?: string
          target_id?: string
          target_table?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          level: number
          name: string
          parent_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          level: number
          name: string
          parent_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          level?: number
          name?: string
          parent_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_primary: boolean
          product_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          product_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          product_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_multi_store_order: boolean
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_recommended: boolean
          lot_size: number
          max_order_qty: number | null
          min_order_qty: number
          name: string
          product_type: string
          recommend_badge: string | null
          recommend_end: string | null
          recommend_start: string | null
          recommend_title: string | null
          requires_delivery_date: boolean
          seal_size_id: string | null
          status: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          allow_multi_store_order?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_recommended?: boolean
          lot_size?: number
          max_order_qty?: number | null
          min_order_qty?: number
          name: string
          product_type: string
          recommend_badge?: string | null
          recommend_end?: string | null
          recommend_start?: string | null
          recommend_title?: string | null
          requires_delivery_date?: boolean
          seal_size_id?: string | null
          status?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          allow_multi_store_order?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_recommended?: boolean
          lot_size?: number
          max_order_qty?: number | null
          min_order_qty?: number
          name?: string
          product_type?: string
          recommend_badge?: string | null
          recommend_end?: string | null
          recommend_start?: string | null
          recommend_title?: string | null
          requires_delivery_date?: boolean
          seal_size_id?: string | null
          status?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seal_size_id_fkey"
            columns: ["seal_size_id"]
            isOneToOne: false
            referencedRelation: "seal_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_files: {
        Row: {
          created_at: string
          display_order: number
          file_type: string
          id: string
          recipe_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_type: string
          id?: string
          recipe_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          display_order?: number
          file_type?: string
          id?: string
          recipe_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_files_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_related_products: {
        Row: {
          created_at: string
          display_order: number
          id: string
          locked_by_user: boolean
          product_code: string | null
          product_name: string
          recipe_id: string
          source_type: string
          spec: string | null
          supplier: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          locked_by_user?: boolean
          product_code?: string | null
          product_name: string
          recipe_id: string
          source_type?: string
          spec?: string | null
          supplier?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          locked_by_user?: boolean
          product_code?: string | null
          product_name?: string
          recipe_id?: string
          source_type?: string
          spec?: string | null
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_related_products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_search_logs: {
        Row: {
          hit_count: number
          id: string
          keyword: string | null
          searched_at: string
          user_id: string
        }
        Insert: {
          hit_count?: number
          id?: string
          keyword?: string | null
          searched_at?: string
          user_id: string
        }
        Update: {
          hit_count?: number
          id?: string
          keyword?: string | null
          searched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_versions: {
        Row: {
          created_at: string
          id: string
          original_storage_path: string | null
          preview_storage_path: string | null
          published_at: string | null
          recipe_id: string
          uploaded_by: string | null
          version_no: number
        }
        Insert: {
          created_at?: string
          id?: string
          original_storage_path?: string | null
          preview_storage_path?: string | null
          published_at?: string | null
          recipe_id: string
          uploaded_by?: string | null
          version_no: number
        }
        Update: {
          created_at?: string
          id?: string
          original_storage_path?: string | null
          preview_storage_path?: string | null
          published_at?: string | null
          recipe_id?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_versions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_view_logs: {
        Row: {
          id: string
          recipe_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_view_logs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          area_id: string | null
          category: string | null
          company_id: string
          created_at: string
          current_version_id: string | null
          id: string
          name: string
          recipe_code: string
          status: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          name: string
          recipe_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          name?: string
          recipe_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "recipe_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      seal_sizes: {
        Row: {
          faces: number
          height_mm: number
          id: string
          note: string | null
          width_mm: number
        }
        Insert: {
          faces: number
          height_mm: number
          id?: string
          note?: string | null
          width_mm: number
        }
        Update: {
          faces?: number
          height_mm?: number
          id?: string
          note?: string | null
          width_mm?: number
        }
        Relationships: []
      }
      store_holidays: {
        Row: {
          company_id: string
          created_at: string
          holiday_date: string
          id: string
          reason: string | null
          registered_by: string
          status: string
          store_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          holiday_date: string
          id?: string
          reason?: string | null
          registered_by: string
          status?: string
          store_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          holiday_date?: string
          id?: string
          reason?: string | null
          registered_by?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_holidays_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_holidays_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          area_id: string | null
          closed_on: string | null
          company_id: string
          created_at: string
          id: string
          manager_contact: string | null
          manager_name: string | null
          name: string
          opened_on: string | null
          status: string
          store_code: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          closed_on?: string | null
          company_id: string
          created_at?: string
          id?: string
          manager_contact?: string | null
          manager_name?: string | null
          name: string
          opened_on?: string | null
          status?: string
          store_code: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          closed_on?: string | null
          company_id?: string
          created_at?: string
          id?: string
          manager_contact?: string | null
          manager_name?: string | null
          name?: string
          opened_on?: string | null
          status?: string
          store_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_applications: {
        Row: {
          base_url: string | null
          code: string
          id: string
          name: string
          status: string
        }
        Insert: {
          base_url?: string | null
          code: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          base_url?: string | null
          code?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      user_access_scopes: {
        Row: {
          area_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          ended_on: string | null
          id: string
          role_id: string
          started_on: string
          store_id: string | null
          system_id: string | null
          user_id: string
        }
        Insert: {
          area_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          ended_on?: string | null
          id?: string
          role_id: string
          started_on?: string
          store_id?: string | null
          system_id?: string | null
          user_id: string
        }
        Update: {
          area_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          ended_on?: string | null
          id?: string
          role_id?: string
          started_on?: string
          store_id?: string | null
          system_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_scopes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_scopes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_scopes_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_scopes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_scopes_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_scopes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string
          employee_id: string | null
          id: string
          must_change_password: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          employee_id?: string | null
          id: string
          must_change_password?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          employee_id?: string | null
          id?: string
          must_change_password?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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

