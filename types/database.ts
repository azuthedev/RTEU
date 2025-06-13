export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          user_role: string | null
          password_hash: string
          created_at: string | null
          is_suspended: boolean | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          user_role?: string | null
          password_hash: string
          created_at?: string | null
          is_suspended?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          user_role?: string | null
          password_hash?: string
          created_at?: string | null
          is_suspended?: boolean | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          two_fa_enabled: boolean | null
        }
        Insert: {
          id?: string
          user_id?: string
          two_fa_enabled?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          two_fa_enabled?: boolean | null
        }
      }
      email_verifications: {
        Row: {
          id: string
          user_id: string | null
          token: string
          created_at: string | null
          expires_at: string
          verified: boolean | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          token: string
          created_at?: string | null
          expires_at: string
          verified?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string | null
          token?: string
          created_at?: string | null
          expires_at?: string
          verified?: boolean | null
        }
      }
      password_reset_tokens: {
        Row: {
          id: string
          token: string
          user_email: string
          expires_at: string
          used_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          token?: string
          user_email: string
          expires_at: string
          used_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          token?: string
          user_email?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string | null
        }
      }
      password_reset_attempts: {
        Row: {
          id: string
          email: string
          attempted_at: string | null
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          referrer: string | null
        }
        Insert: {
          id?: string
          email: string
          attempted_at?: string | null
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          referrer?: string | null
        }
        Update: {
          id?: string
          email?: string
          attempted_at?: string | null
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          referrer?: string | null
        }
      }
    }
    Enums: {
      user_role: "admin" | "customer" | "partner" | "support"
      booking_status: "booked" | "completed" | "cancelled"
      payment_status: "pending" | "completed" | "failed"
      payment_method: "credit_card" | "paypal" | "cash"
      ticket_status: "open" | "closed" | "in_progress"
      trip_status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
      document_type: "license" | "insurance" | "registration" | "other"
      discount_type: "percent" | "fixed"
    }
  }
}