export class UIHelper {
    constructor(client) {
        this.client = client;
    }

    setupEventListeners() {
        // Stamp clicks
        document.querySelectorAll('.stamp').forEach(stamp => {
            stamp.addEventListener('click', () => {
                if (this.client.isWorker) {
                    this.client.addStamp();
                } else {
                    alert(this.client.config.translations[this.client.currentLanguage].workerOnly);
                }
            });
        });

        // Points display click
        document.querySelector('.points-display')?.addEventListener('click', () => {
            if (this.client.isWorker) {
                const amount = parseInt(prompt(this.client.config.translations[this.client.currentLanguage].enterPoints)) || 0;
                if (amount > 0) {
                    this.client.addPoints(amount);
                    alert(this.client.config.translations[this.client.currentLanguage].pointsAdded);
                }
            }
        });

        // Redeem button
        document.getElementById('redeem')?.addEventListener('click', () => {
            this.client.redeem();
        });

        // Worker authentication
        document.getElementById('workerAuth')?.addEventListener('click', () => {
            this.client.authenticateWorker();
        });

        // Worker logout
        document.getElementById('workerLogout')?.addEventListener('click', () => {
            this.client.logoutWorker();
        });

        // Points rewards
        document.querySelectorAll('.points-reward').forEach((reward, index) => {
            reward.addEventListener('click', () => {
                this.client.redeemPoints(index);
            });
        });

        // Language selection
        document.getElementById('languageSelect')?.addEventListener('change', (e) => {
            this.client.currentLanguage = e.target.value;
            localStorage.setItem('language', e.target.value);
            this.updateTranslations();
        });

        // Theme selection
        document.getElementById('themeSelect')?.addEventListener('change', (e) => {
            const isDark = e.target.value === 'dark';
            document.body.classList.toggle('dark-mode', isDark);
            localStorage.setItem('theme', e.target.value);
        });
    }

    updateUI() {
        this.updateStamps();
        this.updateRedeemButton();
        this.updatePointsDisplay();
    }

    showCelebration() {
        window.confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f4d03f', '#f1c40f', '#f39c12', '#e67e22']
        });
    }

    updatePointsDisplay() {
        const pointsDisplay = document.querySelector('.points-display');
        if (pointsDisplay) {
            pointsDisplay.textContent = `${this.client.loyaltySystem.points} Points`;
        }
    }

    updateStamps() {
        const stampElements = document.querySelectorAll('.stamp');
        stampElements.forEach((stamp, index) => {
            stamp.classList.toggle('active', index < this.client.loyaltySystem.stamps);
        });
    }

    updateRedeemButton() {
        const redeemButton = document.getElementById('redeem');
        if (!redeemButton) return;

        const reward = this.client.loyaltySystem.getAvailableReward();
        const translations = this.client.config.translations[this.client.currentLanguage];

        if (reward) {
            redeemButton.textContent = `${translations.redeem} ${reward.drinks} ${reward.drinks > 1 ? translations.freeDrinks : translations.freeDrink}`;
            redeemButton.disabled = false;
        } else {
            redeemButton.textContent = translations.notEnoughStamps;
            redeemButton.disabled = true;
        }
    }

    checkWorkerAuth() {
        const authStatus = document.getElementById('authStatus');
        const workerAuth = document.getElementById('workerAuth');
        const workerLogout = document.getElementById('workerLogout');
        const translations = this.client.config.translations[this.client.currentLanguage];

        if (this.client.isWorker) {
            authStatus.textContent = `👷 ${translations.workerMode}`;
            workerAuth?.classList.add('hidden');
            workerLogout?.classList.remove('hidden');
        } else {
            authStatus.textContent = `👤 ${translations.customerMode}`;
            workerAuth?.classList.remove('hidden');
            workerLogout?.classList.add('hidden');
        }
    }

    setupLanguage() {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = this.client.currentLanguage;
            this.updateTranslations();
        }
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = savedTheme;
        }
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
    }

    renderOffers() {
        const offersContent = document.querySelector('.offers-content');
        if (!offersContent) return;

        offersContent.innerHTML = this.client.config.offers.map(offer => `
            <div class="offer-item">
                <h3>${offer.title}</h3>
                <p>${offer.description}</p>
            </div>
        `).join('');
    }

    renderHistory() {
        const historyContent = document.getElementById('historyContent');
        if (!historyContent) return;

        const translations = this.client.config.translations[this.client.currentLanguage];

        if (!this.client.loyaltySystem.history.length) {
            historyContent.innerHTML = `<p class="no-history">${translations.noHistory}</p>`;
            return;
        }

        historyContent.innerHTML = this.client.loyaltySystem.history.map(item => `
            <div class="history-item">
                <span>${translations.redeemed} ${item.drinks} ${item.drinks > 1 ? translations.freeDrinks : translations.freeDrink}</span>
                <span>${translations.at} ${new Date(item.timestamp).toLocaleString()}</span>
            </div>
        `).join('');
    }

    setupFloatingPoints() {
        const floatingPoints = document.createElement('div');
        floatingPoints.className = 'floating-points';
        floatingPoints.innerHTML = `
            <span>💰</span>
            <span class="points-value">${this.client.loyaltySystem.points}</span>
        `;
        document.body.appendChild(floatingPoints);
    }

    setupComingSoon() {
        const comingSoonFeatures = document.createElement('div');
        comingSoonFeatures.className = 'coming-soon';
        comingSoonFeatures.innerHTML = `
            <h3>${this.client.config.translations[this.client.currentLanguage].comingSoon}</h3>
            <p>🎁 ${this.client.config.translations[this.client.currentLanguage].dailyBonus}</p>
            <p>🔗 ${this.client.config.translations[this.client.currentLanguage].shareReward}</p>
        `;
        document.querySelector('.offers-section')?.appendChild(comingSoonFeatures);
    }

    updateTranslations() {
        const translations = this.client.config.translations[this.client.currentLanguage];
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (key && translations[key]) {
                element.textContent = translations[key];
            }
        });
        this.updateRedeemButton();
        this.renderHistory();
    }
}