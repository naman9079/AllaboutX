const optional = (name: string) => import.meta.env[name] as string | undefined

export const env = {
  apiUrl: optional('VITE_API_URL') || 'http://localhost:8787',
}
