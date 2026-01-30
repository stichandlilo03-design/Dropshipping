import './globals.css';

export const metadata = {
  title: 'DropBoard Dashboard',
  description: 'Dropshipping Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
