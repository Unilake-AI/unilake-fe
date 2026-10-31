import type { ReactNode } from 'react'

import { Inter } from 'next/font/google'

import { Toaster } from '@/components/ui/sonner'

import '../styles/globals.css'
import { Providers } from './providers'

import type { Metadata } from 'next'

const inter = Inter({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
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
