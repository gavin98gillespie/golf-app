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
    PostgrestVersion: "14.5"
  }
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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brass_entries: {
        Row: {
          award_key: string
          brass: number
          created_at: string
          from_user: string
          hole: number
          id: string
          kind: string
          revision: number
          round_id: string
          to_user: string
        }
        Insert: {
          award_key: string
          brass: number
          created_at?: string
          from_user: string
          hole: number
          id?: string
          kind: string
          revision: number
          round_id: string
          to_user: string
        }
        Update: {
          award_key?: string
          brass?: number
          created_at?: string
          from_user?: string
          hole?: number
          id?: string
          kind?: string
          revision?: number
          round_id?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "brass_entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "round_games"
            referencedColumns: ["round_id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          round_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          round_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "user_round_summaries"
            referencedColumns: ["round_id_dup"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_holes: {
        Row: {
          course_id: string
          hole_number: number
          id: string
          par: number
          tee_box: string
          yardage: number | null
        }
        Insert: {
          course_id: string
          hole_number: number
          id?: string
          par: number
          tee_box?: string
          yardage?: number | null
        }
        Update: {
          course_id?: string
          hole_number?: number
          id?: string
          par?: number
          tee_box?: string
          yardage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_holes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          added_by: string | null
          city: string | null
          country: string
          cover_image_url: string | null
          created_at: string
          hole_count: number
          id: string
          lat: number | null
          lng: number | null
          name: string
          osm_id: number | null
          source: string
          state: string | null
          verified: boolean
        }
        Insert: {
          added_by?: string | null
          city?: string | null
          country?: string
          cover_image_url?: string | null
          created_at?: string
          hole_count?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          osm_id?: number | null
          source: string
          state?: string | null
          verified?: boolean
        }
        Update: {
          added_by?: string | null
          city?: string | null
          country?: string
          cover_image_url?: string | null
          created_at?: string
          hole_count?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          osm_id?: number | null
          source?: string
          state?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "courses_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_players: {
        Row: {
          created_at: string
          display_name: string
          id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_players_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          round_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          round_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "user_round_summaries"
            referencedColumns: ["round_id_dup"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          home_course_id: string | null
          id: string
          is_private: boolean
          onboarding_completed: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          home_course_id?: string | null
          id: string
          is_private?: boolean
          onboarding_completed?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          home_course_id?: string | null
          id?: string
          is_private?: boolean
          onboarding_completed?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_course_fkey"
            columns: ["home_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_home_course_id_fkey"
            columns: ["home_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      round_game_players: {
        Row: {
          accepted: boolean
          confirmed_revision: number | null
          round_id: string
          strokes: number
          user_id: string
        }
        Insert: {
          accepted?: boolean
          confirmed_revision?: number | null
          round_id: string
          strokes: number
          user_id: string
        }
        Update: {
          accepted?: boolean
          confirmed_revision?: number | null
          round_id?: string
          strokes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_game_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "round_games"
            referencedColumns: ["round_id"]
          },
        ]
      }
      round_games: {
        Row: {
          course_name: string
          created_at: string
          hole_count: number
          host_id: string
          mode: string
          result: Json | null
          revision: number
          round_id: string
          settled_at: string | null
          stake: number
          state: string
          stroke_order: number[]
        }
        Insert: {
          course_name: string
          created_at?: string
          hole_count: number
          host_id: string
          mode: string
          result?: Json | null
          revision?: number
          round_id: string
          settled_at?: string | null
          stake?: number
          state?: string
          stroke_order: number[]
        }
        Update: {
          course_name?: string
          created_at?: string
          hole_count?: number
          host_id?: string
          mode?: string
          result?: Json | null
          revision?: number
          round_id?: string
          settled_at?: string | null
          stake?: number
          state?: string
          stroke_order?: number[]
        }
        Relationships: []
      }
      round_holes: {
        Row: {
          edited_at: string | null
          edited_by: string | null
          fairway_hit: boolean | null
          gir: boolean | null
          hole_number: number
          id: string
          par: number
          player_id: string
          putts: number | null
          round_id: string
          score: number
        }
        Insert: {
          edited_at?: string | null
          edited_by?: string | null
          fairway_hit?: boolean | null
          gir?: boolean | null
          hole_number: number
          id?: string
          par: number
          player_id: string
          putts?: number | null
          round_id: string
          score: number
        }
        Update: {
          edited_at?: string | null
          edited_by?: string | null
          fairway_hit?: boolean | null
          gir?: boolean | null
          hole_number?: number
          id?: string
          par?: number
          player_id?: string
          putts?: number | null
          round_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "round_holes_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_holes_participant_fkey"
            columns: ["round_id", "player_id"]
            isOneToOne: false
            referencedRelation: "round_players"
            referencedColumns: ["round_id", "user_id"]
          },
          {
            foreignKeyName: "round_holes_participant_fkey"
            columns: ["round_id", "player_id"]
            isOneToOne: false
            referencedRelation: "user_round_summaries"
            referencedColumns: ["round_id", "user_id"]
          },
          {
            foreignKeyName: "round_holes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_holes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "user_round_summaries"
            referencedColumns: ["round_id_dup"]
          },
        ]
      }
      round_players: {
        Row: {
          created_at: string
          finished_at: string | null
          guest_id: string | null
          invited_by: string | null
          joined_at: string | null
          notes: string | null
          profile_id: string | null
          round_id: string
          status: string
          tee_box: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          guest_id?: string | null
          invited_by?: string | null
          joined_at?: string | null
          notes?: string | null
          profile_id?: string | null
          round_id: string
          status: string
          tee_box: string
          user_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          guest_id?: string | null
          invited_by?: string | null
          joined_at?: string | null
          notes?: string | null
          profile_id?: string | null
          round_id?: string
          status?: string
          tee_box?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_players_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_players_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "user_round_summaries"
            referencedColumns: ["round_id_dup"]
          },
        ]
      }
      round_side_games: {
        Row: {
          amount: number
          edited_at: string
          edited_by: string | null
          from_player: string
          hole: number
          id: string
          label: string
          round_id: string
          to_player: string
        }
        Insert: {
          amount: number
          edited_at?: string
          edited_by?: string | null
          from_player: string
          hole: number
          id?: string
          label: string
          round_id: string
          to_player: string
        }
        Update: {
          amount?: number
          edited_at?: string
          edited_by?: string | null
          from_player?: string
          hole?: number
          id?: string
          label?: string
          round_id?: string
          to_player?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_side_games_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_side_games_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_side_games_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "user_round_summaries"
            referencedColumns: ["round_id_dup"]
          },
          {
            foreignKeyName: "round_side_games_round_id_from_player_fkey"
            columns: ["round_id", "from_player"]
            isOneToOne: false
            referencedRelation: "round_players"
            referencedColumns: ["round_id", "user_id"]
          },
          {
            foreignKeyName: "round_side_games_round_id_from_player_fkey"
            columns: ["round_id", "from_player"]
            isOneToOne: false
            referencedRelation: "user_round_summaries"
            referencedColumns: ["round_id", "user_id"]
          },
          {
            foreignKeyName: "round_side_games_round_id_to_player_fkey"
            columns: ["round_id", "to_player"]
            isOneToOne: false
            referencedRelation: "round_players"
            referencedColumns: ["round_id", "user_id"]
          },
          {
            foreignKeyName: "round_side_games_round_id_to_player_fkey"
            columns: ["round_id", "to_player"]
            isOneToOne: false
            referencedRelation: "user_round_summaries"
            referencedColumns: ["round_id", "user_id"]
          },
        ]
      }
      rounds: {
        Row: {
          course_id: string
          created_at: string
          hole_count: number | null
          id: string
          invites_locked_at: string | null
          is_draft: boolean
          is_group: boolean
          join_code: string | null
          live_visible: boolean
          notes: string | null
          played_at: string
          tee_box: string
          total_par: number
          total_score: number
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          course_id: string
          created_at?: string
          hole_count?: number | null
          id?: string
          invites_locked_at?: string | null
          is_draft?: boolean
          is_group?: boolean
          join_code?: string | null
          live_visible?: boolean
          notes?: string | null
          played_at?: string
          tee_box?: string
          total_par?: number
          total_score?: number
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          hole_count?: number | null
          id?: string
          invites_locked_at?: string | null
          is_draft?: boolean
          is_group?: boolean
          join_code?: string | null
          live_visible?: boolean
          notes?: string | null
          played_at?: string
          tee_box?: string
          total_par?: number
          total_score?: number
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_round_summaries: {
        Row: {
          course_id: string | null
          created_at: string | null
          finished_at: string | null
          hole_count: number | null
          holes_played: number | null
          host_id: string | null
          is_draft: boolean | null
          is_group: boolean | null
          joined_at: string | null
          live_visible: boolean | null
          played_at: string | null
          player_notes: string | null
          player_status: string | null
          player_tee_box: string | null
          round_id: string | null
          round_id_dup: string | null
          round_notes: string | null
          round_tee_box: string | null
          total_par: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "user_round_summaries"
            referencedColumns: ["round_id_dup"]
          },
          {
            foreignKeyName: "rounds_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_user_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_skins: {
        Args: { p_revision: number; p_round: string }
        Returns: undefined
      }
      add_round_player: {
        Args: { p_guest_name?: string; p_round: string; p_user?: string }
        Returns: string
      }
      are_mutuals: { Args: { a: string; b: string }; Returns: boolean }
      calculate_skins_result: { Args: { p_round: string }; Returns: Json }
      calculate_skins_units: { Args: { p_round: string }; Returns: Json }
      can_read_round: { Args: { p_round_id: string }; Returns: boolean }
      can_score_group: { Args: { p_round: string }; Returns: boolean }
      configure_skins: {
        Args: {
          p_allowances: Json
          p_mode: string
          p_order: number[]
          p_round: string
        }
        Returns: undefined
      }
      confirm_skins: {
        Args: { p_revision: number; p_round: string }
        Returns: undefined
      }
      contains_blocked_word: { Args: { input: string }; Returns: boolean }
      delete_side_game: { Args: { p_id: string }; Returns: undefined }
      finish_group_round: { Args: { p_round: string }; Returns: undefined }
      force_end_round: { Args: { p_round_id: string }; Returns: undefined }
      generate_join_code: { Args: never; Returns: string }
      get_my_brass_ledger: { Args: never; Returns: Json }
      get_skins_game: { Args: { p_round: string }; Returns: Json }
      invalidate_skins: {
        Args: { p_round: string; p_void: boolean }
        Returns: undefined
      }
      is_blocked: { Args: { a: string; b: string }; Returns: boolean }
      is_following: {
        Args: { p_target: string; p_viewer: string }
        Returns: boolean
      }
      is_following_any_round_player: {
        Args: { p_round_id: string; p_viewer: string }
        Returns: boolean
      }
      is_in_round: {
        Args: { p_round_id: string; p_viewer: string }
        Returns: boolean
      }
      is_mutual_of_any_round_player: {
        Args: { p_round_id: string; p_viewer: string }
        Returns: boolean
      }
      is_skins_member: { Args: { p_round: string }; Returns: boolean }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      redeem_join_code: {
        Args: { p_code: string; p_tee_box: string }
        Returns: string
      }
      refresh_honor_skins: { Args: { p_round: string }; Returns: undefined }
      remove_or_void_skins: { Args: { p_round: string }; Returns: undefined }
      save_side_game: {
        Args: {
          p_amount: number
          p_from: string
          p_hole: number
          p_id?: string
          p_label: string
          p_round: string
          p_to: string
        }
        Returns: string
      }
      save_skins_game: {
        Args: {
          p_allowances: Json
          p_mode: string
          p_order: number[]
          p_round: string
          p_stake: number
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
