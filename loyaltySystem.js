// Updated LoyaltySystem class with loadState method
export class LoyaltySystem {
    constructor(client) {
        this.client = client;
        this.stamps = 0;
        this.points = parseInt(localStorage.getItem('lemonadePoints')) || 0;
        this.lastRedeemTime = parseInt(localStorage.getItem('lastRedeemTime')) || 0;
        this.history = JSON.parse(localStorage.getItem('redeemHistory')) || [];
    }

    loadState() {
        // Load state from localStorage
        this.stamps = parseInt(localStorage.getItem('lemonadeStamps')) || 0;
        this.points = parseInt(localStorage.getItem('lemonadePoints')) || 0;
        this.lastRedeemTime = parseInt(localStorage.getItem('lastRedeemTime')) || 0;
        this.history = JSON.parse(localStorage.getItem('redeemHistory')) || [];
        
        // Initial sync with room presence
        this.client.room.updatePresence({
            [this.client.clientId]: {
                stamps: this.stamps,
                points: this.points,
                history: this.history
            }
        });
    }

    addStamp() {
        if (this.stamps < 10) {
            this.stamps++;
            localStorage.setItem('lemonadeStamps', this.stamps);
            this.client.uiHelper.updateStamps();
            this.saveState();
            this.celebrate();
        }
    }

    addPoints(amount) {
        if (this.client.isWorker) {
            this.points += amount;
            localStorage.setItem('lemonadePoints', this.points);
            this.client.uiHelper.updatePointsDisplay();
            this.saveState();
        }
    }

    canRedeem() {
        const currentTime = Date.now();
        return currentTime - this.lastRedeemTime >= this.client.config.redeemCooldown;
    }

    redeem() {
        if (!this.canRedeem()) {
            const waitTime = Math.ceil((this.client.config.redeemCooldown - (Date.now() - this.lastRedeemTime)) / (1000 * 60 * 60));
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
        this.client.updateUI();
        this.saveState();
        this.client.renderHistory();
    }

    celebrate() {
        // Celebration effects moved to UI helper
        this.client.uiHelper.showCelebration();
    }

    getAvailableReward() {
        return [...this.client.config.rewardTiers]
            .reverse()
            .find(tier => this.stamps >= tier.stamps);
    }

    saveState() {
        this.client.room.updatePresence({
            [this.client.clientId]: {
                stamps: this.stamps,
                points: this.points,
                history: this.history
            }
        });
    }
}