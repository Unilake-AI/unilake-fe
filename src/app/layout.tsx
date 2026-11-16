import type { ReactNode } from 'react'

import localFont from 'next/font/local'

import { Toaster } from '@/components/ui/sonner'

import '../styles/globals.css'
import { Providers } from './providers'

import type { Metadata } from 'next'

const inter = localFont({
  src: './fonts/InterVariable.ttf',
  weight: '100 900',
  style: 'normal',
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'UniLake AI',
  description: 'Nền tảng Data Lake đa nguồn tích hợp AI Analytics cho quản trị đại học.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
