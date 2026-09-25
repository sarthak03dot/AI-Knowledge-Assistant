import type {
  Stats,
  DocumentItem,
  ChunkDetail,
  SearchResultItem,
  AppConfig,
  User,
  AuthResponse,
  RegisterResponse,
  ChatSession,
  ChatMessage,
  PricingPlan,
  CreateOrderResponse,
  VerifyPaymentPayload,
  VerifyPaymentResponse,
  PaymentHistoryItem,
  PlanUsage,
  DocumentPreviewResponse,
} from "../types/rag";

export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const ACCESS_TOKEN_KEY = "nexus_rag_jwt_token";
const REFRESH_TOKEN_KEY = "nexus_rag_refresh_token";

export function isRememberMeActive(): boolean {
  return !!localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthToken(accessToken: string, refreshToken?: string, rememberMe: boolean = true) {
  if (rememberMe) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } else {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    if (refreshToken) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
}

export function clearAuthToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getDocumentViewUrl(docId?: string, fallbackUrl?: string): string {
  if (!docId) return fallbackUrl || "#";
  const token = getAuthToken();
  const base = `/api/documents/${docId}/view`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : fallbackUrl || base;
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthToken();
    return null;
  }

  // Prevent multiple concurrent refresh calls
  if (refreshPromise) {
    return refreshPromise;
  }

  const rememberMe = isRememberMeActive();

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        clearAuthToken();
        return null;
      }

      const data: AuthResponse = await res.json();
      const newAccess = data.access_token || data.token;
      const newRefresh = data.refresh_token || refreshToken;
      setAuthToken(newAccess, newRefresh, rememberMe);
      return newAccess;
    } catch {
      clearAuthToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(input, { ...init, headers });

  // If unauthorized (401), attempt to refresh token once and retry
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(input, { ...init, headers: retryHeaders });
    }
  }

  return response;
}

// -------------------------------------------------------------
// AUTHENTICATION API
// -------------------------------------------------------------
export async function registerUser(email: string, password: string, name: string): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function verifyRegistrationOTP(email: string, otp: string, rememberMe: boolean = true): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "OTP verification failed" }));
    throw new Error(err.detail || "OTP verification failed");
  }
  const data: AuthResponse = await res.json();
  const access = data.access_token || data.token;
  if (access) {
    setAuthToken(access, data.refresh_token, rememberMe);
  }
  return data;
}

export async function resendRegistrationOTP(email: string): Promise<{ status: string; message: string; delivery_provider?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to resend code" }));
    throw new Error(err.detail || "Failed to resend verification code");
  }
  return res.json();
}

export async function loginUser(email: string, password: string, rememberMe: boolean = true): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Invalid email or password");
  }
  const data: AuthResponse = await res.json();
  const access = data.access_token || data.token;
  if (access) {
    setAuthToken(access, data.refresh_token, rememberMe);
  }
  return data;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetchWithAuth(`${API_BASE}/api/auth/me`);
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// SUBSCRIPTION & RAZORPAY PAYMENT API
// -------------------------------------------------------------
export async function fetchPricingPlans(): Promise<Record<string, PricingPlan>> {
  const res = await fetch(`${API_BASE}/api/payments/plans`);
  if (!res.ok) throw new Error("Failed to fetch pricing plans");
  const data = await res.json();
  return data.plans || {};
}

export async function createPaymentOrder(
  planId: string,
  billingCycle: "monthly" | "yearly" = "monthly"
): Promise<CreateOrderResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Order creation failed" }));
    throw new Error(err.detail || "Failed to initialize payment order");
  }
  return res.json();
}

export async function verifyPayment(payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/payments/verify-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Payment verification failed" }));
    throw new Error(err.detail || "Payment verification failed");
  }
  return res.json();
}

export async function fetchPaymentHistory(): Promise<{ total: number; payments: PaymentHistoryItem[] }> {
  const res = await fetchWithAuth(`${API_BASE}/api/payments/history`);
  if (!res.ok) throw new Error("Failed to fetch payment history");
  return res.json();
}

export async function fetchPlanUsage(): Promise<PlanUsage> {
  const res = await fetchWithAuth(`${API_BASE}/api/payments/usage`);
  if (!res.ok) throw new Error("Failed to fetch plan resource usage");
  return res.json();
}

// -------------------------------------------------------------
// RAG & DOCUMENT API
// -------------------------------------------------------------
export async function fetchStats(): Promise<Stats> {
  const res = await fetchWithAuth(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchDocuments(): Promise<DocumentItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return data.documents || [];
}

export async function fetchDocumentChunks(docId: string): Promise<ChunkDetail[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/documents/${docId}/chunks`);
  if (!res.ok) throw new Error("Failed to fetch document chunks");
  const data = await res.json();
  return data.chunks || [];
}

export async function fetchDocumentPreview(docId: string): Promise<DocumentPreviewResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/documents/${docId}/preview`);
  if (!res.ok) throw new Error("Failed to fetch document preview");
  return res.json();
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export function uploadDocuments(
  files: FileList | File[],
  onProgress?: (percent: number, statusText: string) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/documents/upload`);

    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    let intervalId: any = null;

    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Map raw network transfer to 0-70%
          const percent = Math.min(70, Math.round((event.loaded / event.total) * 70));
          if (onProgress) {
            onProgress(percent, `Uploading file bytes (${percent}%)...`);
          }
        }
      };

      xhr.upload.onload = () => {
        // Network stream reached server, now indexing 70% -> 95%
        let current = 70;
        if (onProgress) onProgress(70, "Parsing document & extracting text chunks (70%)...");
        intervalId = setInterval(() => {
          if (current < 92) {
            current += 3;
            if (onProgress) {
              const phase = current < 82
                ? "Extracting semantic neural embeddings..."
                : "Indexing knowledge base & syncing cloud documents...";
              onProgress(current, `${phase} (${current}%)`);
            }
          }
        }, 350);
      };
    }

    xhr.onload = () => {
      if (intervalId) clearInterval(intervalId);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          if (onProgress) onProgress(100, "Ingestion & vector indexing complete! (100%)");
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          resolve({});
        }
      } else {
        let errMessage = "Failed to upload files";
        try {
          const errData = JSON.parse(xhr.responseText);
          errMessage = errData.detail || errMessage;
        } catch {}
        reject(new Error(errMessage));
      }
    };

    xhr.onerror = () => {
      if (intervalId) clearInterval(intervalId);
      reject(new Error("Network error during upload"));
    };

    xhr.send(formData);
  });
}

export async function runVectorSearch(query: string, topK: number = 4, alpha: number = 0.65): Promise<SearchResultItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/vector-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK, alpha }),
  });
  if (!res.ok) throw new Error("Failed to perform vector search");
  const data = await res.json();
  return data.results || [];
}

// -------------------------------------------------------------
// CHAT SESSIONS & HISTORY API
// -------------------------------------------------------------
export async function fetchUserChats(): Promise<ChatSession[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/chats`);
  if (!res.ok) throw new Error("Failed to fetch chat sessions");
  const data = await res.json();
  return data.chats || [];
}

export async function fetchChatById(chatId: string): Promise<ChatSession> {
  const res = await fetchWithAuth(`${API_BASE}/api/chats/${chatId}`);
  if (!res.ok) throw new Error("Failed to fetch chat session");
  return res.json();
}

export async function createChatSession(payload: {
  id?: string;
  title?: string;
  persona?: string;
  custom_persona?: string;
  messages?: ChatMessage[];
}): Promise<ChatSession> {
  const res = await fetchWithAuth(`${API_BASE}/api/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create/sync chat session");
  return res.json();
}

export async function updateChatSession(
  chatId: string,
  payload: {
    title?: string;
    persona?: string;
    custom_persona?: string;
    messages?: ChatMessage[];
  }
): Promise<ChatSession> {
  const res = await fetchWithAuth(`${API_BASE}/api/chats/${chatId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update chat session");
  return res.json();
}

export async function deleteChatSession(chatId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/chats/${chatId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete chat session");
}

export async function updateAppConfig(config: AppConfig): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to update config");
}

export interface StreamCallbacks {
  onInit?: (data: { citations: any[]; provider: string }) => void;
  onProvider?: (provider: string) => void;
  onToken?: (token: string) => void;
  onDone?: (data: { latency: number; confidence: number; provider: string }) => void;
  onError?: (err: any) => void;
}

export async function streamChatQuery(
  query: string,
  topK: number,
  alpha: number,
  chatHistory: { role: string; content: string }[],
  callbacks: StreamCallbacks,
  options?: {
    chatId?: string;
    persona?: string;
    customPersona?: string;
    docIds?: string[];
  },
  signal?: AbortSignal
): Promise<void> {
  let token = getAuthToken();
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const payload: any = {
    query,
    top_k: topK,
    alpha,
    chat_history: chatHistory,
    chat_id: options?.chatId,
    persona: options?.persona || "executive",
    custom_persona: options?.customPersona,
    doc_ids: options?.docIds && options.docIds.length > 0 ? options.docIds : undefined,
  };

  let response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal,
      });
    }
  }

  if (!response.ok || !response.body) {
    if (response.status === 429) {
      const errData = await response.json().catch(() => null);
      const retryAfter = response.headers.get("Retry-After") || (errData?.retry_after_seconds ? `${errData.retry_after_seconds}s` : "a minute");
      const msg = errData?.detail || `Rate limit reached (max 4 requests/min). Please wait ${retryAfter} before asking another question.`;
      throw new Error(msg);
    }
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.detail || `Chat stream request failed: HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data: ")) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.type === "init") {
            callbacks.onInit?.(data);
          } else if (data.type === "provider") {
            callbacks.onProvider?.(data.provider);
          } else if (data.type === "token") {
            callbacks.onToken?.(data.content || "");
          } else if (data.type === "done") {
            callbacks.onDone?.(data);
          }
        } catch {
          // Ignore partial chunk parsing
        }
      }
    }
  }
}
