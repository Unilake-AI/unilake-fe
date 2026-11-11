import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import { API_BASE_URL, SESSION_ENDPOINTS } from '@/api/api'

export async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const token = (await cookies()).get('access_token')?.value
  const apiPath = `/${path.join('/')}`
  const url = `${API_BASE_URL}${apiPath}${request.nextUrl.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('cookie')
  if (token && !headers.has('Authorization') && !SESSION_ENDPOINTS.has(apiPath)) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
  })

  const responseHeaders = new Headers(res.headers)
  // fetch giải nén body nhưng vẫn giữ header của response gốc.
  if (responseHeaders.has('content-encoding')) {
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length')
  }

  return new Response(res.body, { status: res.status, headers: responseHeaders })
}
