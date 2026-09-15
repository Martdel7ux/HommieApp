import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Hommie Admin',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
