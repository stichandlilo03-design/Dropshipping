import { useEffect } from 'react';
import './globals.css';

export const metadata = {
  title: 'DropBoard Dashboard',
  description: 'Dropshipping Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Pinterest noscript fallback */}
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{display: 'none'}} 
            alt="" 
            src="https://ct.pinterest.com/v3/?event=init&tid=2612779406065&noscript=1" 
          />
        </noscript>
      </head>
      <body>
        {/* Pinterest Tag Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.pintrk = window.pintrk || function() {
                (window.pintrk.queue = window.pintrk.queue || []).push(arguments);
              };
              window.pintrk.queue = window.pintrk.queue || [];
              window.pintrk.version = "3.0";
              
              var n = document.createElement("script");
              n.async = true;
              n.src = "https://s.pinimg.com/ct/core.js";
              var t = document.getElementsByTagName("script")[0];
              t.parentNode.insertBefore(n, t);
              
              window.pintrk('load', '2612779406065');
              window.pintrk('page');
            `
          }}
        />
        {children}
      </body>
    </html>
  );
}
