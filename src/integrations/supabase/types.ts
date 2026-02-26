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
      admin_setup: {
        Row: {
          configured_at: string
          id: string
          is_configured: boolean
        }
        Insert: {
          configured_at?: string
          id?: string
          is_configured?: boolean
        }
        Update: {
          configured_at?: string
          id?: string
          is_configured?: boolean
        }
        Relationships: []
      }
      admission_tests: {
        Row: {
          applying_for_class: string
          created_at: string
          dist: string | null
          father_name: string
          id: string
          landmark: string | null
          mobile_no: string
          occupation: string | null
          po: string | null
          present_class: string | null
          present_school: string | null
          ps: string | null
          roll_no: string | null
          session: string
          state: string | null
          status: string
          student_name: string
          student_signature_url: string | null
          test_id: string
          user_id: string
          village: string | null
          whatsapp_no: string | null
        }
        Insert: {
          applying_for_class: string
          created_at?: string
          dist?: string | null
          father_name: string
          id?: string
          landmark?: string | null
          mobile_no: string
          occupation?: string | null
          po?: string | null
          present_class?: string | null
          present_school?: string | null
          ps?: string | null
          roll_no?: string | null
          session: string
          state?: string | null
          status?: string
          student_name: string
          student_signature_url?: string | null
          test_id: string
          user_id: string
          village?: string | null
          whatsapp_no?: string | null
        }
        Update: {
          applying_for_class?: string
          created_at?: string
          dist?: string | null
          father_name?: string
          id?: string
          landmark?: string | null
          mobile_no?: string
          occupation?: string | null
          po?: string | null
          present_class?: string | null
          present_school?: string | null
          ps?: string | null
          roll_no?: string | null
          session?: string
          state?: string | null
          status?: string
          student_name?: string
          student_signature_url?: string | null
          test_id?: string
          user_id?: string
          village?: string | null
          whatsapp_no?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          aadhar_doc_url: string | null
          aadhar_no: string | null
          admission_fee: string | null
          application_id: string
          birth_cert_url: string | null
          created_at: string
          date_of_birth: string
          desired_class: string
          father_name: string
          father_occupation: string | null
          father_qualification: string | null
          form_filled_by: string | null
          full_name: string
          guardian_name: string | null
          guardian_relation: string | null
          guardian_signature_url: string | null
          health_issue: string | null
          id: string
          landmark: string | null
          last_attended_class: string | null
          last_institution: string | null
          mobile_no: string
          monthly_fees: string | null
          mother_name: string
          mother_occupation: string | null
          mother_qualification: string | null
          name_bengali: string | null
          nationality: string
          permanent_dist: string | null
          permanent_pin: string | null
          permanent_po: string | null
          permanent_ps: string | null
          permanent_state: string | null
          permanent_vill: string | null
          photo_url: string
          present_dist: string | null
          present_pin: string | null
          present_po: string | null
          present_ps: string | null
          present_state: string | null
          present_vill: string | null
          religion: string
          session: string | null
          sex: string
          status: string
          user_id: string | null
          whatsapp_no: string | null
        }
        Insert: {
          aadhar_doc_url?: string | null
          aadhar_no?: string | null
          admission_fee?: string | null
          application_id: string
          birth_cert_url?: string | null
          created_at?: string
          date_of_birth: string
          desired_class: string
          father_name: string
          father_occupation?: string | null
          father_qualification?: string | null
          form_filled_by?: string | null
          full_name: string
          guardian_name?: string | null
          guardian_relation?: string | null
          guardian_signature_url?: string | null
          health_issue?: string | null
          id?: string
          landmark?: string | null
          last_attended_class?: string | null
          last_institution?: string | null
          mobile_no: string
          monthly_fees?: string | null
          mother_name: string
          mother_occupation?: string | null
          mother_qualification?: string | null
          name_bengali?: string | null
          nationality?: string
          permanent_dist?: string | null
          permanent_pin?: string | null
          permanent_po?: string | null
          permanent_ps?: string | null
          permanent_state?: string | null
          permanent_vill?: string | null
          photo_url: string
          present_dist?: string | null
          present_pin?: string | null
          present_po?: string | null
          present_ps?: string | null
          present_state?: string | null
          present_vill?: string | null
          religion: string
          session?: string | null
          sex: string
          status?: string
          user_id?: string | null
          whatsapp_no?: string | null
        }
        Update: {
          aadhar_doc_url?: string | null
          aadhar_no?: string | null
          admission_fee?: string | null
          application_id?: string
          birth_cert_url?: string | null
          created_at?: string
          date_of_birth?: string
          desired_class?: string
          father_name?: string
          father_occupation?: string | null
          father_qualification?: string | null
          form_filled_by?: string | null
          full_name?: string
          guardian_name?: string | null
          guardian_relation?: string | null
          guardian_signature_url?: string | null
          health_issue?: string | null
          id?: string
          landmark?: string | null
          last_attended_class?: string | null
          last_institution?: string | null
          mobile_no?: string
          monthly_fees?: string | null
          mother_name?: string
          mother_occupation?: string | null
          mother_qualification?: string | null
          name_bengali?: string | null
          nationality?: string
          permanent_dist?: string | null
          permanent_pin?: string | null
          permanent_po?: string | null
          permanent_ps?: string | null
          permanent_state?: string | null
          permanent_vill?: string | null
          photo_url?: string
          present_dist?: string | null
          present_pin?: string | null
          present_po?: string | null
          present_ps?: string | null
          present_state?: string | null
          present_vill?: string | null
          religion?: string
          session?: string | null
          sex?: string
          status?: string
          user_id?: string | null
          whatsapp_no?: string | null
        }
        Relationships: []
      }
      form_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      id_sequences: {
        Row: {
          class_name: string | null
          id: string
          last_number: number
          sequence_type: string
          session: string
        }
        Insert: {
          class_name?: string | null
          id?: string
          last_number?: number
          sequence_type: string
          session: string
        }
        Update: {
          class_name?: string | null
          id?: string
          last_number?: number
          sequence_type?: string
          session?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_next_id: {
        Args: { p_class?: string; p_session: string; p_type: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
