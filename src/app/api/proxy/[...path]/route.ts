import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const token = (await cookies()).get('access_token')?.value
  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1'
  const url = `${apiBase}/${path.join('/')}${request.nextUrl.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('cookie')
  if (token) {
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
