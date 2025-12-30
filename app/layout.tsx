import type { Metadata, Viewport } from "next"
import { Barlow } from "next/font/google" // CHANGED: DM_Sans -> Barlow
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"

// Configure Barlow font
const barlow = Barlow({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
}

export const metadata: Metadata = {
  title: "Berry - Dog Tracker",
  description: "Track your dog's daily activities",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={barlow.className}>
        {children}
        <Toaster />
        <Script 
          src="https://cdn.iubenda.com/iubenda.js" 
          strategy="lazyOnload" 
        />
      </body>
    </html>
  )
}
