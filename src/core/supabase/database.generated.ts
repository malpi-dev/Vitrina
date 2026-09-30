
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "vitrina": {
          Tables: {
            "categories": {
                  Row: {
                    "id": string,"name": string,"slug": string,"sort_order": number
                  }
                  Insert: {
                    "id"?: string,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"order_items": {
                  Row: {
                    "id": string,"line_total_cents": number | null,"order_id": string,"product_id": string,"product_name": string,"quantity": number,"unit_price_cents": number
                  }
                  Insert: {
                    "id"?: string,"line_total_cents"?: never,"order_id": string,"product_id": string,"product_name": string,"quantity": number,"unit_price_cents": number
                  }
                  Update: {
                    "id"?: string,"line_total_cents"?: never,"order_id"?: string,"product_id"?: string,"product_name"?: string,"quantity"?: number,"unit_price_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "canceled_at": string | null,"created_at": string,"currency": string,"delivered_at": string | null,"id": string,"last_payment_error": string | null,"needs_refund": boolean,"paid_at": string | null,"shipped_at": string | null,"shipping_address": NonNullable<Json>,"shipping_cents": number,"short_code": string,"status": Database["vitrina"]['Enums']["order_status"],"stripe_payment_intent_id": string | null,"subtotal_cents": number,"total_cents": number,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "canceled_at"?: string | null,"created_at"?: string,"currency"?: string,"delivered_at"?: string | null,"id"?: string,"last_payment_error"?: string | null,"needs_refund"?: boolean,"paid_at"?: string | null,"shipped_at"?: string | null,"shipping_address": NonNullable<Json>,"shipping_cents": number,"short_code": string,"status"?: Database["vitrina"]['Enums']["order_status"],"stripe_payment_intent_id"?: string | null,"subtotal_cents": number,"total_cents": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "canceled_at"?: string | null,"created_at"?: string,"currency"?: string,"delivered_at"?: string | null,"id"?: string,"last_payment_error"?: string | null,"needs_refund"?: boolean,"paid_at"?: string | null,"shipped_at"?: string | null,"shipping_address"?: NonNullable<Json>,"shipping_cents"?: number,"short_code"?: string,"status"?: Database["vitrina"]['Enums']["order_status"],"stripe_payment_intent_id"?: string | null,"subtotal_cents"?: number,"total_cents"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"products": {
                  Row: {
                    "category_id": string,"created_at": string,"currency": string,"description": string,"id": string,"image_paths": (string)[],"is_active": boolean,"name": string,"price_cents": number,"slug": string,"stock": number,"updated_at": string
                  }
                  Insert: {
                    "category_id": string,"created_at"?: string,"currency"?: string,"description"?: string,"id"?: string,"image_paths"?: (string)[],"is_active"?: boolean,"name": string,"price_cents": number,"slug": string,"stock": number,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"currency"?: string,"description"?: string,"id"?: string,"image_paths"?: (string)[],"is_active"?: boolean,"name"?: string,"price_cents"?: number,"slug"?: string,"stock"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"default_address": Json | null,"full_name": string | null,"id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"default_address"?: Json | null,"full_name"?: string | null,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"default_address"?: Json | null,"full_name"?: string | null,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"stripe_events": {
                  Row: {
                    "id": string,"received_at": string,"type": string
                  }
                  Insert: {
                    "id": string,"received_at"?: string,"type": string
                  }
                  Update: {
                    "id"?: string,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "advance_order_status":
{ Args: { "p_order_id": string,"p_status": Database["vitrina"]['Enums']["order_status"] }; Returns: {
              "canceled_at": string | null,
"created_at": string,
"currency": string,
"delivered_at": string | null,
"id": string,
"last_payment_error": string | null,
"needs_refund": boolean,
"paid_at": string | null,
"shipped_at": string | null,
"shipping_address": NonNullable<Json>,
"shipping_cents": number,
"short_code": string,
"status": Database["vitrina"]['Enums']["order_status"],
"stripe_payment_intent_id": string | null,
"subtotal_cents": number,
"total_cents": number,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"attach_payment_intent":
{ Args: { "p_order_id": string,"p_payment_intent_id": string }; Returns: undefined
                           },
"cancel_pending_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"create_order":
{ Args: { "p_items": Json,"p_shipping_address": Json }; Returns: {
              "canceled_at": string | null,
"created_at": string,
"currency": string,
"delivered_at": string | null,
"id": string,
"last_payment_error": string | null,
"needs_refund": boolean,
"paid_at": string | null,
"shipped_at": string | null,
"shipping_address": NonNullable<Json>,
"shipping_cents": number,
"short_code": string,
"status": Database["vitrina"]['Enums']["order_status"],
"stripe_payment_intent_id": string | null,
"subtotal_cents": number,
"total_cents": number,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"ensure_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,
"default_address": Json | null,
"full_name": string | null,
"id": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"generate_short_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mark_order_paid":
{ Args: { "p_payment_intent_id": string }; Returns: {
              "canceled_at": string | null,
"created_at": string,
"currency": string,
"delivered_at": string | null,
"id": string,
"last_payment_error": string | null,
"needs_refund": boolean,
"paid_at": string | null,
"shipped_at": string | null,
"shipping_address": NonNullable<Json>,
"shipping_cents": number,
"short_code": string,
"status": Database["vitrina"]['Enums']["order_status"],
"stripe_payment_intent_id": string | null,
"subtotal_cents": number,
"total_cents": number,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"record_payment_failure":
{ Args: { "p_message": string,"p_payment_intent_id": string }; Returns: undefined
                           },
"shipping_cents":
{ Args: { "p_subtotal_cents": number }; Returns: number
                           }
          }
          Enums: {
            "order_status": "pending_payment"|"paid"|"shipped"|"delivered"|"canceled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "vitrina": {
          Enums: {
            "order_status": ["pending_payment", "paid", "shipped", "delivered", "canceled"]
          }
        }
} as const

