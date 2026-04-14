import type { Metadata } from 'next'
import { Belleza, Lato, Charmonman, Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const belleza = Belleza({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--next-font-belleza',
})

const lato = Lato({
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  variable: '--next-font-lato',
})

const charmonman = Charmonman({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--next-font-charmonman',
})

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '900'],
  subsets: ['latin'],
  variable: '--next-font-poppins',
})

export const metadata: Metadata = {
  title: 'Outbound Travelers | Premium Itinerary',
  description: 'Luxury travel itinerary for your dream vacation - Outbound Travelers',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${belleza.variable} ${lato.variable} ${charmonman.variable} ${poppins.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
