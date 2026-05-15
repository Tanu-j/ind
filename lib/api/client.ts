export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new ApiError(json.error ?? "Request failed", response.status);
  }
  return json.data as T;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(path, { credentials: "include" });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(path, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<T>(res);
  },
};
