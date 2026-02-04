import './globals.css';
import PinterestPixel from './components/PinterestPixel';

export const metadata = {
  title: 'DropBoard Dashboard',
  description: 'Dropshipping Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      </head>
      <body>
        <PinterestPixel />
        {children}
      </body>
    </html>
  );
}
