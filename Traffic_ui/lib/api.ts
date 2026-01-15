const API_BASE_URL = "https://8r6m4s80-5000.euw.devtunnels.ms"

interface ApiError {
  message: string
  status: number
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }))
    throw { message: error.message || error.msg || "Request failed", status: response.status } as ApiError
  }
  return response.json()
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ==================== AUTH ====================

export interface LoginResponse {
  access_token: string
  refresh_token: string
  role: string
  username: string
}

export interface User {
  id: string
  username: string
  email: string
  role: "user" | "officer" | "admin"
  status: "APPROVED" | "PENDING" | "BANNED" | "REJECTED"
  points: number
  badges?: string
  badge_number?: string
  institution?: string
  created_at?: string
  banned_until?: string
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
  return handleResponse<LoginResponse>(response)
}

export async function register(username: string, email: string, password: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, role: "user" }),
  })
  return handleResponse(response)
}

export async function applyOfficer(data: {
  username: string
  password: string
  email: string
  badge_number: string
  institution: string
}): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/apply-officer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}

export async function registerAdmin(data: {
  username: string
  password: string
  full_name: string
  department: string
  secret_invite_code: string
}): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/register-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/logout`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  })
}

export async function refreshToken(): Promise<{ access_token: string }> {
  const refreshToken = localStorage.getItem("refresh_token")
  const response = await fetch(`${API_BASE_URL}/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` },
  })
  return handleResponse(response)
}

export async function getProfile(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    headers: { ...getAuthHeaders() },
  })
  return handleResponse<User>(response)
}

// ==================== ACCIDENTS ====================

export interface Accident {
  id: string
  latitude: number
  longitude: number
  description: string
  severity: number
  casualties_injured: number
  casualties_dead: number
  status: "pending_verification" | "confirmed" | "false_report"
  photo_url?: string
  created_at: string
  reporter_id: string
  reporter_username?: string
}

export async function getAccidents(): Promise<Accident[]> {
  const response = await fetch(`${API_BASE_URL}/accidents`, {
    headers: { ...getAuthHeaders() },
  })
  return handleResponse<Accident[]>(response)
}

export async function reportAccident(data: FormData): Promise<Accident> {
  const response = await fetch(`${API_BASE_URL}/accidents`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: data,
  })
  return handleResponse<Accident>(response)
}

export async function deleteAccident(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/accidents/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to delete" }))
    throw { message: error.message, status: response.status }
  }
}

export async function updateAccidentStatus(id: string, status: "confirmed" | "false_report"): Promise<Accident> {
  const response = await fetch(`${API_BASE_URL}/accidents/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  })
  return handleResponse<Accident>(response)
}

// ==================== COMMENTS ====================

export interface Comment {
  id: string
  content: string
  author_id: string
  author_username: string
  created_at: string
  score: number
}

export async function getComments(accidentId: string): Promise<Comment[]> {
  const response = await fetch(`${API_BASE_URL}/accidents/${accidentId}/comments`, {
    headers: { ...getAuthHeaders() },
  })
  return handleResponse<Comment[]>(response)
}

export async function addComment(accidentId: string, content: string): Promise<Comment> {
  const response = await fetch(`${API_BASE_URL}/accidents/${accidentId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ content }),
  })
  return handleResponse<Comment>(response)
}

export async function deleteComment(commentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  })
  if (!response.ok) {
    throw { message: "Failed to delete comment", status: response.status }
  }
}

export async function voteComment(commentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}/vote`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  })
  if (!response.ok) {
    throw { message: "Failed to vote", status: response.status }
  }
}

// ==================== LEADERBOARD ====================

export interface LeaderboardEntry {
  rank: number
  username: string
  points: number
  user_id: string
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${API_BASE_URL}/leaderboard`)
  return handleResponse<LeaderboardEntry[]>(response)
}

// ==================== ADMIN ====================

export async function getUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: { ...getAuthHeaders() },
  })
  return handleResponse<User[]>(response)
}

export async function getPendingOfficers(): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/admin/pending-officers`, {
    headers: { ...getAuthHeaders() },
  })
  return handleResponse<User[]>(response)
}

export async function processOfficer(userId: string, action: "approve" | "reject"): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/admin/process-officer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ user_id: userId, action }),
  })
  return handleResponse(response)
}

export async function processAdmin(userId: string, action: "approve" | "reject"): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/admin/process-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ user_id: userId, action }),
  })
  return handleResponse(response)
}

export async function banUser(
  userId: string,
  duration: "1day" | "1week" | "permanent" | "unban",
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ duration }),
  })
  return handleResponse(response)
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to delete" }))
    throw { message: error.message, status: response.status }
  }
}

// ==================== CHECKINS ====================

export interface Checkin {
  id: string
  latitude: number
  longitude: number
  location_name: string
  created_at: string
  user_id: string
}

export async function createCheckin(data: {
  latitude: number
  longitude: number
  location_name: string
}): Promise<Checkin> {
  const response = await fetch(`${API_BASE_URL}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  })
  return handleResponse<Checkin>(response)
}

export async function getCheckins(): Promise<Checkin[]> {
  const response = await fetch(`${API_BASE_URL}/checkins`, {
    headers: { ...getAuthHeaders() },
  })
  return handleResponse<Checkin[]>(response)
}
