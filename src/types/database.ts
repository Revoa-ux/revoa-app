export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Enums: {
      admin_role: 'admin' | 'super_admin'
      shopify_installation_status: 'installed' | 'pending' | 'requires_reauth' | 'uninstalled'
    }
    Tables: {
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          sender: string
          status: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          timestamp: string
          type: string
          updated_at: string | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender: string
          status?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          timestamp?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender?: string
          status?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          timestamp?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'messages_status_updated_by_fkey'
            columns: ['status_updated_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          file_url: string
          id: string
          metadata: Json | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          file_url: string
          id?: string
          metadata?: Json | null
          status: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          file_url?: string
          id?: string
          metadata?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      user_invoice_history: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          file_url: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          file_url: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          status: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          file_url?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_invoice_history_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_invoice_history_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      shopify_installations: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          installed_at: string | null
          last_auth_at: string | null
          metadata: Json | null
          scopes: string[] | null
          status: Database['public']['Enums']['shopify_installation_status']
          store_url: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          installed_at?: string | null
          last_auth_at?: string | null
          metadata?: Json | null
          scopes?: string[] | null
          status?: Database['public']['Enums']['shopify_installation_status']
          store_url: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          installed_at?: string | null
          last_auth_at?: string | null
          metadata?: Json | null
          scopes?: string[] | null
          status?: Database['public']['Enums']['shopify_installation_status']
          store_url?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shopify_installations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      shopify_sync_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          status: string
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          status: string
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'shopify_sync_logs_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'shopify_installations'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'products_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          id: string
          images: string[] | null
          item_cost: number
          name: string
          product_id: string
          recommended_price: number
          shipping_cost: number
          sku: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          images?: string[] | null
          item_cost: number
          name: string
          product_id: string
          recommended_price: number
          shipping_cost: number
          sku: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          images?: string[] | null
          item_cost?: number
          name?: string
          product_id?: string
          recommended_price?: number
          shipping_cost?: number
          sku?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_approval_history: {
        Row: {
          comments: string | null
          id: string
          metadata: Json | null
          product_id: string
          reviewed_at: string | null
          reviewed_by: string
          status: string
        }
        Insert: {
          comments?: string | null
          id?: string
          metadata?: Json | null
          product_id: string
          reviewed_at?: string | null
          reviewed_by: string
          status: string
        }
        Update: {
          comments?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string
          reviewed_at?: string | null
          reviewed_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_approval_history_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_approval_history_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      admin_activity_logs: {
        Row: {
          action_details: Json
          action_type: string
          admin_id: string
          created_at: string | null
          id: string
          response_time: unknown | null
        }
        Insert: {
          action_details: Json
          action_type: string
          admin_id: string
          created_at?: string | null
          id?: string
          response_time?: unknown | null
        }
        Update: {
          action_details?: Json
          action_type?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          response_time?: unknown | null
        }
        Relationships: []
      }
      user_assignments: {
        Row: {
          admin_id: string
          assigned_at: string | null
          id: string
          last_interaction_at: string | null
          metadata: Json | null
          total_invoices: number | null
          total_transactions: number | null
          user_id: string
        }
        Insert: {
          admin_id: string
          assigned_at?: string | null
          id?: string
          last_interaction_at?: string | null
          metadata?: Json | null
          total_invoices?: number | null
          total_transactions?: number | null
          user_id: string
        }
        Update: {
          admin_id?: string
          assigned_at?: string | null
          id?: string
          last_interaction_at?: string | null
          metadata?: Json | null
          total_invoices?: number | null
          total_transactions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_assignments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      user_profiles: {
        Row: {
          admin_permissions: string[] | null
          admin_role: string | null
          admin_status: string | null
          confirmation_token: string | null
          created_at: string | null
          email: string
          encrypted_password: string | null
          id: string
          is_admin: boolean | null
          last_login: string | null
          metadata: Json | null
          onboarding_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_permissions?: string[] | null
          admin_role?: string | null
          admin_status?: string | null
          confirmation_token?: string | null
          created_at?: string | null
          email: string
          encrypted_password?: string | null
          id?: string
          is_admin?: boolean | null
          last_login?: string | null
          metadata?: Json | null
          onboarding_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_permissions?: string[] | null
          admin_role?: string | null
          admin_status?: string | null
          confirmation_token?: string | null
          created_at?: string | null
          email?: string
          encrypted_password?: string | null
          id?: string
          is_admin?: boolean | null
          last_login?: string | null
          metadata?: Json | null
          onboarding_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shopify_stores: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          scopes: string[] | null
          status: string | null
          store_url: string
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          scopes?: string[] | null
          status?: string | null
          store_url: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          scopes?: string[] | null
          status?: string | null
          store_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      oauth_sessions: {
        Row: {
          created_at: string
          error: string | null
          expires_at: string
          id: string
          metadata: Json | null
          shop_domain: string
          state: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          expires_at: string
          id?: string
          metadata?: Json | null
          shop_domain: string
          state: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          expires_at?: string
          id?: string
          metadata?: Json | null
          shop_domain?: string
          state?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'oauth_sessions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_active_at: string | null
          metadata: Json | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_active_at?: string | null
          metadata?: Json | null
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_active_at?: string | null
          metadata?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'admin_users_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
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

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never