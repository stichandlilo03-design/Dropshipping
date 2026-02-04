'use client';

import { useEffect } from 'react';

export default function PinterestPixel() {
  useEffect(() => {
    // Initialize Pinterest pixel
    window.pintrk = window.pintrk || function() {
      (window.pintrk.queue = window.pintrk.queue || []).push(arguments);
    };
    window.pintrk.queue = window.pintrk.queue || [];
    window.pintrk.version = "3.0";

    // Load Pinterest script
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://s.pinimg.com/ct/core.js";
    document.body.appendChild(script);

    // Initialize tracking
    window.pintrk('load', '2612779406065');
    window.pintrk('page');

    console.log('[Pinterest] Pixel initialized successfully');
  }, []);

  return (
    <noscript>
      <img 
        height="1" 
        width="1" 
        style={{display: 'none'}} 
        alt="" 
        src="https://ct.pinterest.com/v3/?event=init&tid=2612779406065&noscript=1" 
      />
    </noscript>
  );
}
