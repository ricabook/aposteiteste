export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          background_color: string
          background_gradient: string | null
          button_text: string
          button_url: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          background_gradient?: string | null
          button_text: string
          button_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          background_gradient?: string | null
          button_text?: string
          button_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bets: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_closed: boolean | null
          is_settled: boolean
          odds: number
          option_chosen: string
          payout_amount: number | null
          poll_id: string
          potential_payout: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_closed?: boolean | null
          is_settled?: boolean
          odds: number
          option_chosen: string
          payout_amount?: number | null
          poll_id: string
          potential_payout: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_closed?: boolean | null
          is_settled?: boolean
          odds?: number
          option_chosen?: string
          payout_amount?: number | null
          poll_id?: string
          potential_payout?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bets_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          status: string
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      odds_history: {
        Row: {
          created_at: string
          id: string
          option_a_odds: number
          option_a_percentage: number
          option_b_odds: number
          option_b_percentage: number
          poll_id: string
          total_volume: number
        }
        Insert: {
          created_at?: string
          id?: string
          option_a_odds: number
          option_a_percentage: number
          option_b_odds: number
          option_b_percentage: number
          poll_id: string
          total_volume?: number
        }
        Update: {
          created_at?: string
          id?: string
          option_a_odds?: number
          option_a_percentage?: number
          option_b_odds?: number
          option_b_percentage?: number
          poll_id?: string
          total_volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "odds_history_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          filled_quantity: number
          id: string
          option_chosen: string
          order_type: string
          poll_id: string
          price: number
          quantity: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filled_quantity?: number
          id?: string
          option_chosen: string
          order_type: string
          poll_id: string
          price: number
          quantity: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filled_quantity?: number
          id?: string
          option_chosen?: string
          order_type?: string
          poll_id?: string
          price?: number
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          poll_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          poll_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          poll_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_poll_comments_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "poll_comments_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["poll_category"] | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          slug: string
          image_url: string | null
          is_active: boolean
          is_resolved: boolean
          option_a: string
          option_b: string
          option_images: Json | null
          options: Json | null
          poll_type: string
          question: string
          removed_at: string | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
          winning_option: string | null
        }
        Insert: {
          approved_at?: string | null
          slug?: string
          approved_by?: string | null
          category?: Database["public"]["Enums"]["poll_category"] | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_resolved?: boolean
          option_a: string
          option_b: string
          option_images?: Json | null
          options?: Json | null
          poll_type?: string
          question: string
          removed_at?: string | null
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
          winning_option?: string | null
        }
        Update: {
          approved_at?: string | null
          slug?: string
          approved_by?: string | null
          category?: Database["public"]["Enums"]["poll_category"] | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_resolved?: boolean
          option_a?: string
          option_b?: string
          option_images?: Json | null
          options?: Json | null
          poll_type?: string
          question?: string
          removed_at?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          winning_option?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          id: string
          nome_completo: string | null
          updated_at: string
          user_id: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          nome_completo?: string | null
          updated_at?: string
          user_id: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          nome_completo?: string | null
          updated_at?: string
          user_id?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      shares: {
        Row: {
          created_at: string
          id: string
          option_chosen: string
          poll_id: string
          price_paid: number
          quantity: number
          total_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_chosen: string
          poll_id: string
          price_paid: number
          quantity: number
          total_cost: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_chosen?: string
          poll_id?: string
          price_paid?: number
          quantity?: number
          total_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shares_poll_id"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          buy_order_id: string
          buyer_id: string
          created_at: string
          id: string
          option_chosen: string
          poll_id: string
          price: number
          quantity: number
          sell_order_id: string | null
          seller_id: string
        }
        Insert: {
          buy_order_id: string
          buyer_id: string
          created_at?: string
          id?: string
          option_chosen: string
          poll_id: string
          price: number
          quantity: number
          sell_order_id?: string | null
          seller_id: string
        }
        Update: {
          buy_order_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
          option_chosen?: string
          poll_id?: string
          price?: number
          quantity?: number
          sell_order_id?: string | null
          seller_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          admin_user_id: string | null
          amount: number
          bet_id: string | null
          created_at: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          amount: number
          bet_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          amount?: number
          bet_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "bets"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          pix_key: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
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
      auto_delete_removed_polls: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_odds: {
        Args: { poll_id: string; option: string }
        Returns: number
      }
      check_password_strength: {
        Args: { password_text: string }
        Returns: Json
      }
      check_user_is_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      close_simple_bet: {
        Args: {
          _poll_id: string
          _user_id: string
          _option: string
          _amount: number
        }
        Returns: Json
      }
      execute_buy_order: {
        Args: {
          _poll_id: string
          _user_id: string
          _option: string
          _quantity: number
          _max_price: number
        }
        Returns: Json
      }
      execute_sell_order: {
        Args: {
          _poll_id: string
          _user_id: string
          _option: string
          _quantity: number
        }
        Returns: Json
      }
      execute_wallet_transaction: {
        Args: {
          _user_id: string
          _amount: number
          _transaction_type: string
          _description: string
        }
        Returns: Json
      }
      get_market_price: {
        Args: { poll_id: string; option: string }
        Returns: number
      }
      get_option_stats: {
        Args: { poll_id: string; option: string }
        Returns: {
          total_bettors: number
          total_amount: number
        }[]
      }
      get_poll_volume_data: {
        Args: { poll_id_param: string }
        Returns: {
          option_chosen: string
          total_volume: number
          unique_bettors: number
        }[]
      }
      get_simple_odds: {
        Args: { _poll_id: string; _option: string }
        Returns: number
      }
      get_user_bets: {
        Args: { _user_id: string; _poll_id: string }
        Returns: {
          option_chosen: string
          total_amount: number
          bet_count: number
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      is_user_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      place_simple_bet: {
        Args: {
          _poll_id: string
          _user_id: string
          _option: string
          _amount: number
        }
        Returns: Json
      }
      resolve_poll: {
        Args: { _poll_id: string; _winning_option: string }
        Returns: Json
      }
    }
    Enums: {
      poll_category:
        | "politics"
        | "sports"
        | "economics"
        | "entertainment"
        | "technology"
        | "science"
        | "crypto"
        | "other"
        | "entretenimento"
        | "tecnologia"
        | "ciencia"
        | "criptomoedas"
        | "geopolitica"
        | "politica"
        | "esportes"
        | "economia"
        | "esports"
        | "noticias"
      user_role: "admin" | "user"
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
      poll_category: [
        "politics",
        "sports",
        "economics",
        "entertainment",
        "technology",
        "science",
        "crypto",
        "other",
        "entretenimento",
        "tecnologia",
        "ciencia",
        "criptomoedas",
        "geopolitica",
        "politica",
        "esportes",
        "economia",
        "esports",
        "noticias",
      ],
      user_role: ["admin", "user"],
    },
  },
} as const
