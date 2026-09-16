import { apiRequest } from "./queryClient";

export { apiRequest };
import type { Brand, ContentTemplate, FollowupTemplate, EmailLog } from "@shared/schema";

export interface EmailSendRequest {
  brandId: string;
  templateType?: "general" | "followup";
  subjectOverride?: string;
  htmlOverride?: string;
  nicheIdeaUsed?: string;
}

export interface DashboardStats {
  totalBrands: number;
  emailsSent: number;
  responseRate: string;
  openRate: string;
  activeCampaigns: number;
  recentActivities?: any[];
  campaignPerformance?: any[];
}

export async function sendEmailToBrand(request: EmailSendRequest) {
  const response = await apiRequest("POST", "/api/send-email", request);
  return response.json();
}

export async function getBrands() {
  const response = await apiRequest("GET", "/api/brands");
  return response.json();
}

export async function createBrand(brand: any) {
  const response = await apiRequest("POST", "/api/brands", brand);
  return response.json();
}

export async function updateBrand(id: string, brand: any) {
  const response = await apiRequest("PUT", `/api/brands/${id}`, brand);
  return response.json();
}

export async function deleteBrand(id: string) {
  const response = await apiRequest("DELETE", `/api/brands/${id}`);
  return response.json();
}

export async function bulkUpdateBrands(ids: string[], data: any) {
  const response = await apiRequest("POST", "/api/brands/bulk-update", { ids, data });
  return response.json();
}

export async function getContentTemplates() {
  const response = await apiRequest("GET", "/api/content-templates");
  return response.json();
}

export async function createContentTemplate(template: any) {
  const response = await apiRequest("POST", "/api/content-templates", template);
  return response.json();
}

export async function updateContentTemplate(id: string, template: any) {
  const response = await apiRequest("PUT", `/api/content-templates/${id}`, template);
  return response.json();
}

export async function deleteContentTemplate(id: string) {
  const response = await apiRequest("DELETE", `/api/content-templates/${id}`);
  return response.json();
}

export async function getFollowupTemplates() {
  const response = await apiRequest("GET", "/api/followup-templates");
  return response.json();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiRequest("GET", "/api/dashboard/stats");
  return response.json();
}

export async function getBrandsTyped(): Promise<Brand[]> {
  const response = await apiRequest("GET", "/api/brands");
  return response.json();
}

export async function getContentTemplatesTyped(): Promise<ContentTemplate[]> {
  const response = await apiRequest("GET", "/api/content-templates");
  return response.json();
}

export async function getFollowupTemplatesTyped(): Promise<FollowupTemplate[]> {
  const response = await apiRequest("GET", "/api/followup-templates");
  return response.json();
}

export async function syncReplies() {
  const response = await apiRequest("POST", "/api/brands/sync-replies");
  return response.json();
}
