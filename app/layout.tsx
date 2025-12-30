import type { Metadata, Viewport } from "next"
import { DM_Sans } from "next/font/google" // CHANGED: Inter -> DM_Sans
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script" // Added for Privacy Policy

// Configure DM Sans font
const dmSans = DM_Sans({ 
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on iPhone inputs
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
      <body className={dmSans.className}>
        {children}
        <Toaster />
        
        {/* Iubenda Privacy Policy Script loaded once globally */}
        <Script 
          src="https://cdn.iubenda.com/iubenda.js" 
          strategy="lazyOnload" 
        />
      </body>
    </html>
  )
}
