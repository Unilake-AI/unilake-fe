import { NextResponse } from 'next/server'

export function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('access_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  response.cookies.delete('access_token')
  response.cookies.delete('refresh_token')
  return response
}
