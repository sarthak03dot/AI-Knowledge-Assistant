export interface User {
  id: string;
  email: string;
  name: string;
  avatar_color?: string;
  role?: "admin" | "user";
  is_admin?: boolean;
  plan?: "free" | "pro" | "enterprise";
  plan_status?: string;
  plan_updated_at?: number;
  query_count?: number;
  offer_note?: string;
  custom_doc_limit?: number;
  custom_query_limit?: number;
  created_at: number;
  document_ids?: string[];
  documents_count?: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  avatar_color?: string;
  role: "admin" | "user";
  is_admin: boolean;
  plan: string;
  plan_status: string;
  plan_updated_at?: number;
  query_count: number;
  offer_note?: string;
  custom_doc_limit?: number;
  custom_query_limit?: number;
  created_at: number;
  document_ids: string[];
  documents_count: number;
}

export interface AdminUsersResponse {
  users: AdminUserItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminPaymentItem {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  order_id: string;
  payment_id?: string;
  plan_id: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
}

export interface AdminPaymentsResponse {
  payments: AdminPaymentItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminDashboardData {
  metrics: {
    total_users: number;
    plan_breakdown: {
      free: number;
      pro: number;
      enterprise: number;
    };
    total_documents: number;
    total_chats: number;
    total_revenue_inr: number;
    total_paid_orders: number;
    recent_payments: AdminPaymentItem[];
  };
  active_rate_limit: number;
  payment_gateway: {
    is_configured: boolean;
    provider: string;
    key_id: string;
  };
  cloudinary: {
    configured: boolean;
    cloud_name: string;
  };
  plans: Record<string, PricingPlan>;
}

export interface SystemSettings {
  rate_limit_per_minute: number;
  active_rate_limit?: number;
  plans: Record<string, PricingPlan>;
  payment_gateway?: {
    provider: string;
    enabled: boolean;
    currency: string;
    test_mode: boolean;
  };
  ai_settings?: {
    default_llm_provider: string;
    default_top_k: number;
    default_alpha: number;
  };
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token: string;
  user: User;
  db_engine: string;
}

export interface RegisterResponse {
  status: string;
  requires_otp: boolean;
  email: string;
  name: string;
  message: string;
  delivery_provider?: string;
}

export interface Stats {
  total_documents: number;
  total_chunks: number;
  vector_dimension: number;
  vector_database: string;
  database?: string;
  is_neon?: boolean;
  has_cloudinary?: boolean;
  cloudinary_cloud?: string;
  embedding_provider: string;
  has_nvidia?: boolean;
  has_gemini: boolean;
  has_groq: boolean;
  has_openrouter: boolean;
  avg_chunk_length_words: number;
  vocabulary_size: number;
}

export interface DocumentItem {
  size_bytes?: number;
  file_size?: number;
  filename: string;
  doc_id: string;
  doc_name: string;
  chunk_count: number;
  char_count: number;
  word_count: number;
  created_at: number;
  cloudinary_url?: string;
  cloudinary_public_id?: string;
}

export interface DocumentPageImage {
  page: number;
  image_url: string;
}

export interface DocumentPreviewResponse {
  doc_id: string;
  doc_name: string;
  cloudinary_url?: string;
  cloudinary_public_id?: string;
  total_pages: number;
  page_urls: DocumentPageImage[];
  signed_url: string;
  private_download_url: string;
  stream_view_url: string;
}

export interface ChunkDetail {
  chunk_id: string;
  chunk_index: number;
  char_count: number;
  word_count: number;
  text: string;
  cloudinary_url?: string;
}

export interface Citation {
  citation_id: string;
  doc_id?: string;
  doc_name: string;
  chunk_index: number;
  chunk_id?: string;
  score?: number;
  dense_score?: number;
  sparse_score?: number;
  snippet?: string;
  cloudinary_url?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  model?: string;
  latency?: number;
  confidence?: number;
  isStreaming?: boolean;
  scopedDocs?: string[];
}

export type AIPersonaKey = "executive" | "architect" | "researcher" | "tutor" | "custom";

export interface AIPersona {
  id: AIPersonaKey;
  name: string;
  tagline: string;
  iconName: string;
  badgeColor: string;
  description: string;
  samplePrompt: string;
}

export interface ChatSession {
  id: string;
  user_id?: string;
  title: string;
  persona?: AIPersonaKey | string;
  custom_persona?: string;
  messages?: ChatMessage[];
  message_count?: number;
  last_message?: string;
  created_at: number;
  updated_at: number;
}

export interface SearchResultItem {
  chunk_id: string;
  doc_name: string;
  chunk_index: number;
  score: number;
  dense_score: number;
  sparse_score: number;
  text: string;
}

export interface AppConfig {
  nvidia_api_key?: string;
  groq_api_key?: string;
  gemini_api_key?: string;
  openrouter_api_key?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  top_k?: number;
  alpha?: number;
}

export interface PricingPlan {
  id: "free" | "pro" | "enterprise";
  name: string;
  tagline: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  document_limit: number;
  chunk_limit: number;
  badge?: string;
  highlight?: boolean;
}

export interface PaymentOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: "monthly" | "yearly";
  receipt: string;
  is_sandbox?: boolean;
}

export interface CreateOrderResponse {
  status: string;
  order: PaymentOrder;
}

export interface VerifyPaymentPayload {
  order_id: string;
  payment_id: string;
  signature: string;
  plan_id: string;
  billing_cycle?: "monthly" | "yearly";
  amount?: number;
  currency?: string;
}

export interface VerifyPaymentResponse {
  status: string;
  message: string;
  plan: string;
  billing_cycle: string;
  payment_id: string;
  user: User;
}

export interface PaymentHistoryItem {
  id: string;
  user_id: string;
  order_id: string;
  payment_id?: string;
  plan_id: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
}

export interface PlanUsage {
  plan_id: string;
  plan_name: string;
  plan_status: string;
  plan_updated_at?: number;
  document_count: number;
  document_limit: number;
  document_usage_percent: number;
  chunk_count: number;
  chunk_limit: number;
  chunk_usage_percent: number;
  features: string[];
  is_unlimited_docs: boolean;
  is_unlimited_chunks: boolean;
}
