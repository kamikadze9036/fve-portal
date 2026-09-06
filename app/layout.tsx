import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FVE přehled',
  description:
    'Přehled výroby, spotřeby, nákupu, prodeje a úspor fotovoltaiky.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased">{children}</body>
    </html>
  );
}
