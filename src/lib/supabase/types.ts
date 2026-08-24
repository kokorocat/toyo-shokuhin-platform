export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
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
      haccp_check_points: {
        Row: {
          category: string
          company_id: string
          created_at: string
          display_order: number
          id: string
          max_value: number | null
          min_value: number | null
          name: string
          status: string
          store_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          display_order?: number
          id?: string
          max_value?: number | null
          min_value?: number | null
          name: string
          status?: string
          store_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          display_order?: number
          id?: string
          max_value?: number | null
          min_value?: number | null
          name?: string
          status?: string
          store_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_check_points_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_check_points_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_temperature_records: {
        Row: {
          check_point_id: string
          created_at: string
          id: string
          is_out_of_range: boolean
          note: string | null
          recorded_at: string
          recorded_by: string
          recorded_on: string
          store_id: string
          value: number
        }
        Insert: {
          check_point_id: string
          created_at?: string
          id?: string
          is_out_of_range?: boolean
          note?: string | null
          recorded_at?: string
          recorded_by: string
          recorded_on?: string
          store_id: string
          value: number
        }
        Update: {
          check_point_id?: string
          created_at?: string
          id?: string
          is_out_of_range?: boolean
          note?: string | null
          recorded_at?: string
          recorded_by?: string
          recorded_on?: string
          store_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "haccp_temperature_records_check_point_id_fkey"
            columns: ["check_point_id"]
            isOneToOne: false
            referencedRelation: "haccp_check_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_temperature_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_temperature_records_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_hygiene_items: {
        Row: {
          company_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_hygiene_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_hygiene_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_hygiene_records: {
        Row: {
          checked_at: string
          checked_by: string
          checked_on: string
          created_at: string
          id: string
          is_ok: boolean
          item_id: string
          note: string | null
          store_id: string
        }
        Insert: {
          checked_at?: string
          checked_by: string
          checked_on?: string
          created_at?: string
          id?: string
          is_ok: boolean
          item_id: string
          note?: string | null
          store_id: string
        }
        Update: {
          checked_at?: string
          checked_by?: string
          checked_on?: string
          created_at?: string
          id?: string
          is_ok?: boolean
          item_id?: string
          note?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_hygiene_records_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "haccp_hygiene_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_hygiene_records_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_hygiene_records_store_id_fkey"
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
