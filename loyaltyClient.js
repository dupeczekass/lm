// New file containing the moved LoyaltyClient class definition
import { config } from './config.js';
import { LoyaltySystem } from './loyaltySystem.js';
import { UIHelper } from './uiHelper.js';

export class LoyaltyClient {
    constructor() {
        this.config = config;
        this.clientId = this.generateClientId();
        this.isWorker = localStorage.getItem('workerAuthenticated') === 'true';
        this.room = new WebsimSocket();
        this.currentLanguage = localStorage.getItem('language') || 'en';
        
        this.loyaltySystem = new LoyaltySystem(this);
        this.uiHelper = new UIHelper(this);
        
        this.adminPanelButton = this.createAdminPanelButton();
        
        this.initializeMultiplayer().then(() => {
            this.init();
        });
    }

    init() {
        // Initialize from localStorage and sync with room presence
        this.loyaltySystem.loadState();
        this.uiHelper.setupEventListeners();
        this.uiHelper.updateRedeemButton();
        this.uiHelper.checkWorkerAuth();
        this.uiHelper.renderOffers();
        this.uiHelper.updateUI();
        this.uiHelper.setupLanguage();
        this.uiHelper.setupTheme();
        this.uiHelper.renderHistory();
        this.uiHelper.setupFloatingPoints();
        this.uiHelper.setupComingSoon();
        this.uiHelper.updateStamps(); // Make sure stamps are displayed initially
    }

    addStamp() {
        this.loyaltySystem.addStamp();
        this.loyaltySystem.addPoints(1);
        this.uiHelper.updateUI();
    }

    redeem() {
        this.loyaltySystem.redeem();
    }

    redeemPoints(rewardIndex) {
        this.loyaltySystem.redeemPoints(rewardIndex);
    }

    addPoints(amount) {
        this.loyaltySystem.addPoints(amount);
    }

    celebrate() {
        this.uiHelper.celebrate();
    }

    setupEventListeners() {
        // handled by uiHelper
    }

    async initializeMultiplayer() {
        await this.room.initialize();
        
        this.room.subscribePresence((presence) => {
            if (presence[this.clientId]) {
                this.loyaltySystem.stamps = presence[this.clientId].stamps || 0;
                this.loyaltySystem.points = presence[this.clientId].points || 0;
                this.loyaltySystem.history = presence[this.clientId].history || [];
                this.uiHelper.updateUI(); 
            }
        });

        this.room.updatePresence({
            [this.clientId]: {
                stamps: this.loyaltySystem.stamps,
                points: this.loyaltySystem.points,
                history: this.loyaltySystem.history
            }
        });

        await this.waitForElements();

        this.displayClientInfo();
    }

    async waitForElements() {
        return new Promise(resolve => {
            const checkElements = () => {
                const clientIdElement = document.getElementById('clientId');
                const qrContainer = document.getElementById('qrCode');
                
                if (clientIdElement && qrContainer) {
                    resolve();
                } else {
                    setTimeout(checkElements, 100);
                }
            };
            checkElements();
        });
    }

    async displayClientInfo() {
        const clientIdElement = document.getElementById('clientId');
        const qrContainer = document.getElementById('qrCode');

        if (!clientIdElement || !qrContainer) {
            console.warn('Client info elements not found');
            return;
        }

        clientIdElement.textContent = this.clientId;
        qrContainer.innerHTML = '';
        
        try {
            const workerUrl = new URL('worker.html', window.location.href);
            workerUrl.searchParams.set('client-id', this.clientId);
            
            // Create clickable link
            const link = document.createElement('a');
            link.href = workerUrl.toString();
            link.target = '_blank';
            
            const canvas = document.createElement('canvas');
            link.appendChild(canvas);
            qrContainer.appendChild(link);
            
            QRCode.toCanvas(canvas, workerUrl.toString(), {
                width: 200,
                height: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
        } catch (error) {
            console.error('Error generating QR code:', error);
            qrContainer.innerHTML = `<p>Error generating QR code. Client ID: ${this.clientId}</p>`;
        }
    }

    generateClientId() {
        const savedId = localStorage.getItem('clientId');
        if (savedId) return savedId;
        
        const newId = Math.floor(1000 + Math.random() * 9000).toString();
        localStorage.setItem('clientId', newId);
        return newId;
    }

    createAdminPanelButton() {
        const button = document.createElement('button');
        button.id = 'adminPanelButton';
        button.innerHTML = '🔧 Admin Panel';
        button.className = 'admin-panel-button hidden';
        button.onclick = () => window.location.href = 'worker.html';
        document.body.appendChild(button);
        return button;
    }

    logoutWorker() {
        localStorage.setItem('workerAuthenticated', 'false');
        this.isWorker = false;
        this.adminPanelButton.classList.add('hidden');
        this.uiHelper.checkWorkerAuth();
    }

    authenticateWorker() {
        const translations = config.translations[this.currentLanguage];
        const pin = prompt(translations.enterPin);
        if (pin === config.workerPin) {
            localStorage.setItem('workerAuthenticated', 'true');
            this.isWorker = true;
            this.adminPanelButton.classList.remove('hidden');
            this.uiHelper.checkWorkerAuth();
            alert(translations.workerSuccess);
        } else {
            localStorage.setItem('workerAuthenticated', 'false');
            this.isWorker = false;
            this.adminPanelButton.classList.add('hidden');
            this.uiHelper.checkWorkerAuth();
            alert(translations.invalidPin);
        }
    }
}