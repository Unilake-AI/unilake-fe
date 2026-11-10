import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import { API_BASE_URL } from '@/api/api'

async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const token = (await cookies()).get('access_token')?.value
  const apiBase = API_BASE_URL
  const url = `${apiBase}/${path.join('/')}${request.nextUrl.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('cookie')
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
  })

  return new Response(res.body, { status: res.status, headers: res.headers })
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE }
