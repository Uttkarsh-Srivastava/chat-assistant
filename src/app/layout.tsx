import type { Metadata } from 'next';
import { geistSans } from '@/styling/fonts';
import '@/styling/globals.css';

export const metadata: Metadata = {
  title: 'Chat Assistant',
  description: 'AI assistant with streaming chat',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
