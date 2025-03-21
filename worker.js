import { config } from './config.js';

// Simplified Worker Panel class
export class WorkerPanel {
    constructor() {
        this.isAuthenticated = localStorage.getItem('workerAuthenticated') === 'true';
        this.room = new WebsimSocket();
        this.scanner = null;
        
        // Initialize websocket and UI
        this.initializeMultiplayer().then(() => {
            this.initializeUI();
            this.setupEventListeners();
            
            // Show appropriate panel based on auth status
            if (this.isAuthenticated) {
                this.showWorkerPanel();
            } else {
                this.showLoginPanel();
            }

            // Check URL for client ID
            const urlParams = new URLSearchParams(window.location.search);
            const clientId = urlParams.get('client-id');
            if (clientId && this.isAuthenticated) {
                document.getElementById('clientLookupId').value = clientId;
                this.lookupClient(clientId);
            }
        });
    }

    async initializeMultiplayer() {
        if (!this.room.initialized) {
            await this.room.initialize();
        }
    }

    initializeUI() {
        // Initialize login form if not present
        if (!document.getElementById('workerLogin')) {
            const loginPanel = document.createElement('div');
            loginPanel.id = 'workerLogin';
            loginPanel.innerHTML = `
                <div class="modal-content">
                    <h2>Worker Login</h2>
                    <div class="login-form">
                        <input type="password" id="workerPin" placeholder="Enter worker PIN">
                        <button id="loginButton">Login</button>
                        <p id="loginError" class="error-message"></p>
                    </div>
                </div>
            `;
            document.body.appendChild(loginPanel);
        }

        // Create worker panel if it doesn't exist
        if (!document.getElementById('workerPanel')) {
            const workerPanel = document.createElement('div');
            workerPanel.id = 'workerPanel';
            workerPanel.className = 'hidden';
            workerPanel.innerHTML = `
                <div class="modal-content">
                    <h2>Worker Panel</h2>
                    <div class="client-lookup">
                        <input type="text" id="clientLookupId" placeholder="Enter 4-digit Client ID">
                        <button id="lookupClient">Look Up Client</button>
                    </div>
                    <div id="clientDetails" class="hidden">
                        <h3>Client Details</h3>
                        <div class="client-stats">
                            <p>Points: <span id="clientPoints" class="stat-value">0</span></p>
                            <p>Stamps: <span id="clientStamps" class="stat-value">0</span></p>
                        </div>
                        <div class="client-actions">
                            <button id="addClientPoints">Add Points</button>
                            <button id="addClientStamp">Add Stamp</button>
                        </div>
                        <div class="redemption-history">
                            <h4>Recent Redemptions</h4>
                            <div id="clientRedemptions"></div>
                        </div>
                    </div>
                </div>
                <button id="returnToMain">Return to Main Page</button>
            `;
            document.body.appendChild(workerPanel);
        }

        // Add QR Scanner button and video element
        const scannerContainer = document.createElement('div');
        scannerContainer.id = 'qrScanner';
        scannerContainer.className = 'qr-scanner hidden';
        scannerContainer.innerHTML = `
            <div class="scanner-container">
                <video id="qrVideo"></video>
                <div class="scanner-overlay"></div>
                <button id="closeScanner">Close Scanner</button>
            </div>
        `;
        document.body.appendChild(scannerContainer);

        // Add scan button to worker panel
        const lookupDiv = document.querySelector('.client-lookup');
        if (lookupDiv) {
            const scanButton = document.createElement('button');
            scanButton.id = 'startScanner';
            scanButton.textContent = 'Scan QR Code';
            lookupDiv.appendChild(scanButton);
        }
    }

    setupEventListeners() {
        // Login handler
        document.getElementById('loginButton')?.addEventListener('click', () => {
            const pin = document.getElementById('workerPin')?.value;
            this.authenticateWorker(pin);
        });

        // Pin input enter key handler
        document.getElementById('workerPin')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const pin = document.getElementById('workerPin')?.value;
                this.authenticateWorker(pin);
            }
        });

        // Client lookup
        document.getElementById('lookupClient')?.addEventListener('click', () => {
            const clientId = document.getElementById('clientLookupId')?.value;
            this.lookupClient(clientId);
        });

        // Client actions
        document.getElementById('addClientPoints')?.addEventListener('click', () => {
            this.addPointsToClient();
        });

        document.getElementById('addClientStamp')?.addEventListener('click', () => {
            this.addStampToClient();
        });
        
        document.getElementById('returnToMain')?.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('startScanner')?.addEventListener('click', () => {
            this.startQRScanner();
        });

        document.getElementById('closeScanner')?.addEventListener('click', () => {
            this.stopQRScanner();
        });
    }

    showLoginPanel() {
        const loginPanel = document.getElementById('workerLogin');
        const workerPanel = document.getElementById('workerPanel');
        
        if (loginPanel && workerPanel) {
            loginPanel.style.display = 'block';
            workerPanel.style.display = 'none';
        }
    }

    showWorkerPanel() {
        const loginPanel = document.getElementById('workerLogin');
        const workerPanel = document.getElementById('workerPanel');
        
        if (loginPanel && workerPanel) {
            loginPanel.style.display = 'none';
            workerPanel.style.display = 'block';
        }
    }

    authenticateWorker(pin) {
        if (pin === config.workerPin) {
            this.isAuthenticated = true;
            localStorage.setItem('workerAuthenticated', 'true');
            this.showWorkerPanel();
            this.showSuccessAnimation('login');
        } else {
            const errorElement = document.getElementById('loginError');
            if (errorElement) {
                errorElement.textContent = 'Invalid PIN!';
                setTimeout(() => errorElement.textContent = '', 3000);
            }
        }
    }

    async lookupClient(clientId) {
        if (!clientId) return;

        const clientData = this.room.presence[clientId];
        const clientDetails = document.getElementById('clientDetails');
        
        if (clientData && clientDetails) {
            const pointsElement = document.getElementById('clientPoints');
            const stampsElement = document.getElementById('clientStamps');
            const redemptionsElement = document.getElementById('clientRedemptions');

            if (pointsElement) pointsElement.textContent = clientData.points || 0;
            if (stampsElement) stampsElement.textContent = clientData.stamps || 0;
            
            if (redemptionsElement) {
                const redemptionsHtml = (clientData.history || [])
                    .map(item => {
                        const date = new Date(item.timestamp);
                        let rewardDetails = '';
                        if(item.drinks) {
                            rewardDetails = `${item.drinks} free drinks`;
                        } else if(item.points) {
                            rewardDetails = `${item.points} points for ${item.reward}`;
                        }
                        return `
                            <div class="history-item">
                                <span class="history-date">${date.toLocaleString()}</span>
                                <span class="history-reward">${rewardDetails}</span>
                            </div>
                        `;
                    })
                    .join('');
                
                redemptionsElement.innerHTML = 
                    redemptionsHtml || '<p class="no-history">No redemption history</p>';
            }
            
            clientDetails.classList.remove('hidden');
        } else {
            alert('Client not found');
        }
    }

    addPointsToClient() {
        const clientId = document.getElementById('clientLookupId')?.value;
        const points = parseInt(prompt('Enter points to add:') || '0');
        
        if (points > 0 && clientId) {
            const clientData = this.room.presence[clientId] || {};
            this.room.updatePresence({
                [clientId]: {
                    ...clientData,
                    points: (clientData.points || 0) + points
                }
            });
            this.lookupClient(clientId);
            this.showSuccessAnimation('points', points);
        }
    }

    addStampToClient() {
        const clientId = document.getElementById('clientLookupId')?.value;
        if (!clientId) return;

        const clientData = this.room.presence[clientId] || {};
        
        if ((clientData.stamps || 0) < 10) {
            this.room.updatePresence({
                [clientId]: {
                    ...clientData,
                    stamps: (clientData.stamps || 0) + 1
                }
            });
            this.lookupClient(clientId);
            this.showSuccessAnimation('stamp');
        }
    }

    showSuccessAnimation(type, value = '') {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = type === 'points' ? 
            `Added ${value} points!` : 
            type === 'login' ? 
            'Login successful!' : 
            'Added stamp!';
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    async startQRScanner() {
        const scannerContainer = document.getElementById('qrScanner');
        const video = document.getElementById('qrVideo');
        
        if (!scannerContainer || !video) return;

        try {
            // Load QR Scanner library
            const { default: QrScanner } = await import('https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/+esm');
            
            scannerContainer.classList.remove('hidden');
            
            this.scanner = new QrScanner(
                video,
                result => {
                    const url = new URL(result.data);
                    const clientId = url.searchParams.get('client-id');
                    if (clientId) {
                        document.getElementById('clientLookupId').value = clientId;
                        this.lookupClient(clientId);
                        this.stopQRScanner();
                    }
                },
                {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                }
            );
            
            await this.scanner.start();
        } catch (error) {
            console.error('Failed to start QR scanner:', error);
            alert('Failed to start camera. Please make sure you have granted camera permissions.');
        }
    }

    stopQRScanner() {
        if (this.scanner) {
            this.scanner.stop();
            this.scanner.destroy();
            this.scanner = null;
        }
        document.getElementById('qrScanner')?.classList.add('hidden');
    }
}

// Initialize worker panel when page loads
document.addEventListener('DOMContentLoaded', () => {
    new WorkerPanel();
});