export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          onboarding_completed: boolean;
          metadata: Record<string, any> | null;
          created_at: string;
          updated_at: string;
          last_login?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          onboarding_completed?: boolean;
          metadata?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          onboarding_completed?: boolean;
          metadata?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}