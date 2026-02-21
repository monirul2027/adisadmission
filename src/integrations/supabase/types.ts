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
          full_name: string
          guardian_name: string | null
          guardian_relation: string | null
          guardian_signature_url: string | null
          health_issue: string | null
          id: string
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
          full_name: string
          guardian_name?: string | null
          guardian_relation?: string | null
          guardian_signature_url?: string | null
          health_issue?: string | null
          id?: string
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
          full_name?: string
          guardian_name?: string | null
          guardian_relation?: string | null
          guardian_signature_url?: string | null
          health_issue?: string | null
          id?: string
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
          sex?: string
          status?: string
          user_id?: string | null
          whatsapp_no?: string | null
        }
        Relationships: []
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
