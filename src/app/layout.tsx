import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Captain Cool - Multi-Agent IPL Match Strategist',
  description: 'GDG Cloud Pune APL hackathon strategy console powered by Gemini multi-agent orchestration.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
