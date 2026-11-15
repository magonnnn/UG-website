type TeamId = number | string;

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: TeamId;
          faceit_id: string | null;
        };
        Insert: {
          id?: TeamId;
          faceit_id?: string | null;
        };
        Update: {
          id?: TeamId;
          faceit_id?: string | null;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          team_1_id: TeamId | null;
          team_2_id: TeamId | null;
          faceit_match_id: string | null;
          cancelled: boolean;
        };
        Insert: {
          team_1_id?: TeamId | null;
          team_2_id?: TeamId | null;
          faceit_match_id?: string | null;
          cancelled?: boolean;
        };
        Update: {
          team_1_id?: TeamId | null;
          team_2_id?: TeamId | null;
          faceit_match_id?: string | null;
          cancelled?: boolean;
        };
        Relationships: [];
      };
      faceit_webhook_events: {
        Row: {
          event_key: string;
          event_type: string;
          match_id: string;
          created_at: string;
          processing_started_at: string;
          processed_at: string | null;
        };
        Insert: {
          event_key: string;
          event_type: string;
          match_id: string;
          created_at?: string;
          processing_started_at?: string;
          processed_at?: string | null;
        };
        Update: {
          event_key?: string;
          event_type?: string;
          match_id?: string;
          created_at?: string;
          processing_started_at?: string;
          processed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
