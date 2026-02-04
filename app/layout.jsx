'use client';

import { useEffect } from 'react';
import './globals.css';

export const metadata = {
  title: 'DropBoard Dashboard',
  description: 'Dropshipping Dashboard',
};

export default function RootLayout({ children }) {
  // 📌 PINTEREST TAG INITIALIZATION
  useEffect(() => {
    // Initialize Pinterest Tag
    if (typeof window !== 'undefined' && !window.pintrk) {
      window.pintrk = function () {
        window.pintrk.queue.push(Array.prototype.slice.call(arguments));
      };
      const n = window.pintrk;
      n.queue = [];
      n.version = "3.0";
      
      const t = document.createElement("script");
      t.async = true;
      t.src = "https://s.pinimg.com/ct/core.js";
      const r = document.getElementsByTagName("script")[0];
      r.parentNode.insertBefore(t, r);
    }

    // Load Pinterest with your Pixel ID
    if (typeof window !== 'undefined' && window.pintrk) {
      window.pintrk('load', '2612779406065', {
        em: '' // Will be set dynamically when user email is known
      });
      window.pintrk('page');
    }
  }, []);

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
      <body>{children}</body>
    </html>
  );
}
