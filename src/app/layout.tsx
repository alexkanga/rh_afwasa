import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'RH-AFWASA — Gestion des Ressources Humaines',
  description: "Système de gestion des ressources humaines et de la paie — Association Africaine de l'Eau et de l'Assainissement",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}