const API_BASE = import.meta.env.VITE_API_URL;

interface FetchOptions extends Omit<RequestInit, "headers"> {
  // allows overriding the token (if you ever want to pass a different one)
  token?: string;
  headers?: Record<string, string>;
}

export async function authFetch(path: string, options: FetchOptions = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  
  // build headers
  const token = options.token ?? localStorage.getItem("jwt");
  const headers: Record<string,string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string,string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    // pull error text or status
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(errText || `HTTP ${res.status}`);
  }

  // assume JSON response by default
  return res.json();
}

/*
    GET Requests use:
        const todos = await authFetch("/api/todos");

    POST with a JSON body:
        const newTodo = await authFetch("/api/todos", {
            method: "POST",
            body: JSON.stringify({ title: "Buy milk" })
        });

    PUT to update:
        await authFetch("/api/todos/123", {
            method: "PUT",
            body: JSON.stringify({ title: "Buy almond milk" })
        });
    
    DELETE:
        await authFetch("/api/todos/123", { method: "DELETE" });
*/
