import { supabase } from "@/integrations/supabase/client";

export const API_URL = import.meta.env.VITE_API_URL || "";

export type ScanTargetType =
  | "contract_address"
  | "solana_program"
  | "web3_project";

export type ScanStatus = "queued" | "running" | "completed" | "failed";

export interface ScanFinding {
  id: string;
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: string;
  confidenceScore: number;
  description: string;
  evidence: string;
  location: string;
  tool: string;
  recommendation: string;
  references: string[];
}

export interface ScanReport {
  target: {
    type: ScanTargetType | string;
    sourceKind: string;
    url: string | null;
    originalFilename: string | null;
    analyzedPath: string;
    chain: string | null;
    repository: string | null;
  };
  summary: {
    riskScore: number;
    totalFindings: number;
    severityBreakdown: Record<string, number>;
    confidenceAverage: number;
    toolsUsed: string[];
    scannerCoverage: string;
  };
  findings: ScanFinding[];
  ai_analysis: {
    executiveSummary: string;
    criticalRisks: Array<{
      title: string;
      severity: string;
      recommendation: string;
    }>;
    remediationRoadmap: string[];
    trainingSignals: string[];
  };
  limitations: string[];
  metadata: {
    generatedAt: string;
    level: string;
    workspaceKind: string;
  };
}

export interface ScanJob {
  id: string;
  status: ScanStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  targetType: string;
  targetUrl: string | null;
  sourceKind: string;
  report: ScanReport | null;
  error: string | null;
  warnings: string[];
}

export interface CreateScanRequest {
  targetType: ScanTargetType;
  targetUrl?: string;
  level: string;
  file?: File | null;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

async function buildAuthHeaders(baseHeaders?: HeadersInit): Promise<Headers> {
  const headers = new Headers(baseHeaders || {});
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return headers;
}

export async function createScan(request: CreateScanRequest): Promise<ScanJob> {
  const formData = new FormData();
  formData.append("targetType", request.targetType);
  formData.append("level", request.level);
  if (request.targetUrl) {
    formData.append("targetUrl", request.targetUrl);
  }
  if (request.file) {
    formData.append("file", request.file);
  }

  const response = await fetch(`${API_URL}/api/scans`, {
    method: "POST",
    headers: await buildAuthHeaders(),
    body: formData,
  });

  const data = await parseApiResponse<{ ok: boolean; scan: ScanJob }>(response);
  return data.scan;
}

export async function getScan(scanId: string): Promise<ScanJob> {
  const response = await fetch(`${API_URL}/api/scans/${scanId}`, {
    headers: await buildAuthHeaders(),
  });
  const data = await parseApiResponse<{ ok: boolean; scan: ScanJob }>(response);
  return data.scan;
}

export async function getScanReport(scanId: string): Promise<ScanReport> {
  const response = await fetch(`${API_URL}/api/scans/${scanId}/report`, {
    headers: await buildAuthHeaders(),
  });
  const data = await parseApiResponse<{ ok: boolean; report: ScanReport }>(response);
  return data.report;
}

export async function listRecentApiScans(): Promise<ScanJob[]> {
  const response = await fetch(`${API_URL}/api/scans/recent`, {
    headers: await buildAuthHeaders(),
  });
  const data = await parseApiResponse<{ ok: boolean; scans: ScanJob[] }>(response);
  return data.scans;
}

export async function analyzeTarget(request: CreateScanRequest): Promise<{ ok: boolean; analysis?: { id: string; targetType: string; targetUrl: string | null; level: string; report: ScanReport }; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: await buildAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(request),
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.error || "Analysis failed" };
    }
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { ok: false, error: message };
  }
}

export async function pollScan(scanId: string, options?: { intervalMs?: number; timeoutMs?: number }): Promise<ScanJob> {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 120000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const scan = await getScan(scanId);
    if (scan.status === "completed" || scan.status === "failed") {
      return scan;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timeout while waiting for scan completion");
}

export const checkDatabaseConnection = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/api/db-test`, {
      headers: await buildAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.error || "Database connection failed" };
    }
    return { ok: Boolean(data.ok) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { ok: false, error: message };
  }
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

// ============================================
// AUTH API — через наш бэкенд, а не Supabase напрямую
// ============================================
export async function registerUser(email: string, password: string) {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Registration failed");
  }
  return response.json();
}

export async function loginUser(email: string, password: string) {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Login failed");
  }
  return response.json();
}
