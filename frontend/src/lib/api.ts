const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ title: res.statusText }))
    throw new Error(
      (err as { title?: string; message?: string }).title ??
        (err as { title?: string; message?: string }).message ??
        res.statusText
    )
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export { BASE }
