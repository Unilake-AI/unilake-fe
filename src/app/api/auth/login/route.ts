import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1'

    let res: Response
    if (contentType.includes('application/json')) {
      const jsonBody = (await request.json()) as Record<string, unknown>
      res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonBody),
      })
    } else {
      const body = await request.formData()
      res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        body,
      })
    }

    if (!res.ok) {
      const err = (await res
        .json()
        .catch(() => ({ detail: 'Đăng nhập không thành công' }))) as Record<string, unknown>
      return NextResponse.json(err, { status: res.status })
    }

    const data = (await res.json()) as { access_token: string }
    const response = NextResponse.json({ ok: true, access_token: data.access_token })

    response.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    return response
  } catch (error) {
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : 'Lỗi kết nối máy chủ xác thực',
      },
      { status: 500 }
    )
  }
}
