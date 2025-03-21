import { config } from './config.js';
import { WorkerPanel } from './worker.js';
import { LoyaltyClient } from './client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Load confetti script before initializing
    await new Promise((resolve) => {
        const confettiScript = document.createElement('script');
        confettiScript.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
        confettiScript.onload = resolve;
        document.head.appendChild(confettiScript);
    });

    // Load QR code library before initializing
    await new Promise((resolve) => {
        const qrScript = document.createElement('script');
        qrScript.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js';
        qrScript.onload = resolve;
        document.head.appendChild(qrScript);
    });

    const isWorkerPage = window.location.pathname.includes('worker.html');
    
    if (isWorkerPage) {
        new WorkerPanel();
    } else {
        new LoyaltyClient();
    }
});