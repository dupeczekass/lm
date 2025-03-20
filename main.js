import confetti from 'confetti';
import { config } from './config.js';

class LoyaltyCard {
    constructor() {
        this.stamps = 0;
        this.points = parseInt(localStorage.getItem('lemonadePoints')) || 0;
        this.lastRedeemTime = parseInt(localStorage.getItem('lastRedeemTime')) || 0;
        this.isWorker = false;
        this.loadState();
        this.setupEventListeners();
        this.updateRedeemButton();
        this.checkWorkerAuth();
        this.renderOffers();
        this.updatePointsDisplay();
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.history = JSON.parse(localStorage.getItem('redeemHistory')) || [];
        this.setupLanguage();
        this.setupTheme();
        this.renderHistory();
    }

    loadState() {
        const savedStamps = localStorage.getItem('lemonadeStamps');
        if (savedStamps !== null) {
            this.stamps = parseInt(savedStamps);
            this.updateUI();
        }
    }

    saveState() {
        localStorage.setItem('lemonadeStamps', this.stamps.toString());
    }

    updateUI() {
        const stampElements = document.querySelectorAll('.stamp');
        stampElements.forEach((stamp, index) => {
            stamp.classList.toggle('active', index < this.stamps);
        });
        this.updateRedeemButton();
    }

    updateRedeemButton() {
        const redeemBtn = document.getElementById('redeem');
        const availableReward = this.getAvailableReward();
        
        if (availableReward) {
            redeemBtn.disabled = false;
            redeemBtn.textContent = `Redeem ${availableReward.drinks} Free Drink${availableReward.drinks > 1 ? 's' : ''}!`;
        } else {
            redeemBtn.disabled = true;
            redeemBtn.textContent = 'Not Enough Stamps';
        }
    }

    getAvailableReward() {
        return [...config.rewardTiers]
            .reverse()
            .find(tier => this.stamps >= tier.stamps);
    }

    addStamp() {
        if (this.stamps < 10) {
            this.stamps++;
            this.updateUI();
            this.saveState();
            
            // Add a mini confetti effect when adding a stamp
            confetti({
                particleCount: 30,
                spread: 40,
                origin: { y: 0.7 },
                colors: ['#f4d03f', '#f1c40f', '#f39c12']
            });
        }
    }

    updatePointsDisplay() {
        const pointsDisplay = document.querySelector('.points-display');
        pointsDisplay.textContent = `${this.points} Points`;
    }

    addPoints(amount) {
        if (this.isWorker) {
            this.points += amount;
            localStorage.setItem('lemonadePoints', this.points);
            this.updatePointsDisplay();
        }
    }

    redeemPoints(rewardIndex) {
        const reward = config.pointRewards[rewardIndex];
        if (this.points >= reward.points) {
            this.points -= reward.points;
            localStorage.setItem('lemonadePoints', this.points);
            this.updatePointsDisplay();
            const translations = config.translations[this.currentLanguage];
            alert(`${translations.congrats} ${translations.redeemedReward} ${translations[`reward${rewardIndex + 1}`]}!`);
        } else {
            alert(config.translations[this.currentLanguage].notEnoughPoints);
        }
    }

    canRedeem() {
        const currentTime = Date.now();
        return currentTime - this.lastRedeemTime >= config.redeemCooldown;
    }

    redeem() {
        if (!this.canRedeem()) {
            const waitTime = Math.ceil((config.redeemCooldown - (Date.now() - this.lastRedeemTime)) / (1000 * 60 * 60));
            alert(`Please wait ${waitTime} hours before redeeming again.`);
            return;
        }

        const reward = this.getAvailableReward();
        if (!reward) return;

        this.celebrate();
        const redeemTime = new Date().toISOString();
        this.history.unshift({
            drinks: reward.drinks,
            stamps: reward.stamps,
            timestamp: redeemTime
        });
        localStorage.setItem('redeemHistory', JSON.stringify(this.history));
        
        alert(`Congratulations! You've earned ${reward.drinks} free drink${reward.drinks > 1 ? 's' : ''}!`);
        this.stamps = 0;
        this.lastRedeemTime = Date.now();
        localStorage.setItem('lastRedeemTime', this.lastRedeemTime);
        this.updateUI();
        this.saveState();
        this.renderHistory();
    }

    async celebrate() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f4d03f', '#f1c40f', '#f39c12', '#e67e22']
        });

        // Sequential confetti bursts
        await new Promise(resolve => setTimeout(resolve, 200));
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 }
        });

        await new Promise(resolve => setTimeout(resolve, 200));
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 }
        });
    }

    renderOffers() {
        const offersContainer = document.querySelector('.offers-content');
        config.offers.forEach(offer => {
            const offerElement = document.createElement('div');
            offerElement.className = 'offer-item';
            offerElement.innerHTML = `
                <h3>${offer.title}</h3>
                <p>${offer.description}</p>
            `;
            offersContainer.appendChild(offerElement);
        });
    }

    checkWorkerAuth() {
        const isAuthenticated = localStorage.getItem('workerAuthenticated');
        this.isWorker = isAuthenticated === 'true';
        document.body.classList.toggle('worker-mode', this.isWorker);
        document.getElementById('authStatus').textContent = 
            this.isWorker ? '👤 Worker Mode' : '👤 Customer Mode';
    }

    authenticateWorker() {
        const translations = config.translations[this.currentLanguage];
        const pin = prompt(translations.enterPin);
        if (pin === config.workerPin) {
            localStorage.setItem('workerAuthenticated', 'true');
            this.isWorker = true;
            this.checkWorkerAuth();
            alert(translations.workerSuccess);
        } else {
            localStorage.setItem('workerAuthenticated', 'false');
            this.isWorker = false;
            this.checkWorkerAuth();
            alert(translations.invalidPin);
        }
    }

    logoutWorker() {
        localStorage.setItem('workerAuthenticated', 'false');
        this.isWorker = false;
        this.checkWorkerAuth();
    }

    setupEventListeners() {
        document.getElementById('redeem').addEventListener('click', () => this.redeem());
        document.getElementById('workerAuth').addEventListener('click', () => this.authenticateWorker());
        document.getElementById('workerLogout').addEventListener('click', () => this.logoutWorker());
        
        document.querySelectorAll('.stamp').forEach((stamp, index) => {
            stamp.addEventListener('click', () => {
                if (this.isWorker && index === this.stamps && this.stamps < 10) {
                    this.addStamp();
                    this.addPoints(1);
                } else if (!this.isWorker && index === this.stamps) {
                    alert('Only workers can add stamps!');
                }
            });
        });

        document.querySelector('.points-display').addEventListener('click', () => {
            if (this.isWorker) {
                const points = prompt('Enter points to add:');
                if (points !== null && !isNaN(points)) {
                    this.addPoints(parseInt(points));
                    alert(`Added ${points} points successfully!`);
                }
            }
        });

        document.querySelectorAll('.points-reward').forEach((element, index) => {
            element.addEventListener('click', () => {
                this.redeemPoints(index);
            });
        });

        // Add smooth scroll to settings when clicking settings button
        document.querySelector('.settings-panel').addEventListener('click', () => {
            document.querySelector('.settings-panel').scrollIntoView({ 
                behavior: 'smooth' 
            });
        });

        // Add hover sound effect
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                if (this.isWorker) {
                    const hoverSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAADAAAGhgBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqr///////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAABoZyHdikAAAAAAAAAAAAAAAAAAAA//tQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxBeDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
                    hoverSound.play();
                }
            });
        });
    }

    setupLanguage() {
        document.getElementById('languageSelect').value = this.currentLanguage;
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            localStorage.setItem('language', this.currentLanguage);
            this.updateTranslations();
        });
        this.updateTranslations();
    }

    setupTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.getElementById('themeSelect').value = theme;
        document.body.classList.toggle('dark-mode', theme === 'dark');

        document.getElementById('themeSelect').addEventListener('change', (e) => {
            const newTheme = e.target.value;
            localStorage.setItem('theme', newTheme);
            document.body.classList.toggle('dark-mode', newTheme === 'dark');
        });
    }

    updateTranslations() {
        const translations = config.translations[this.currentLanguage];
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });
        this.updateRedeemButton();
        this.renderHistory();
    }

    renderHistory() {
        const historyContent = document.getElementById('historyContent');
        const translations = config.translations[this.currentLanguage];
        
        if (this.history.length === 0) {
            historyContent.innerHTML = `<div class="history-item">${translations.noHistory}</div>`;
            return;
        }

        historyContent.innerHTML = this.history.map(item => {
            const date = new Date(item.timestamp);
            return `
                <div class="history-item">
                    ${translations.redeemed} ${item.drinks} ${item.drinks > 1 ? translations.freeDrinks : translations.freeDrink}
                    ${translations.at} ${date.toLocaleString(this.currentLanguage)}
                </div>
            `;
        }).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoyaltyCard();
});