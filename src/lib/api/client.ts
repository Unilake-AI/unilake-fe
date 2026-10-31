import createClient from 'openapi-fetch'

import type { paths } from './schema'

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/proxy',
  credentials: 'include',
})
