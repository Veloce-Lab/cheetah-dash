class CheetahDash {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.init();
        this.loadAssets();
        this.showScreen('start-screen');
        this.updateGlobalStats();
    }

    init() {
        // Game state
        this.gameRunning = false;
        this.score = 0;
        this.distance = 0;
        this.lives = 3;
        this.frames = 0;
        this.gameSpeed = 5;
        this.personalBest = 0;
        
        // Power-up states
        this.activePowerups = {
            speedBoost: { active: false, duration: 0, maxDuration: 180 }, // 3 seconds at 60fps
            shield: { active: false, duration: 0, maxDuration: 300 }, // 5 seconds
            doublePoints: { active: false, duration: 0, maxDuration: 600 } // 10 seconds
        };

        // Cheetah properties
        this.cheetah = {
            x: 100,
            y: this.canvas.height / 2,
            width: 60,
            height: 40,
            velocity: 0,
            gravity: 0.5,
            jumpStrength: -12,
            isSliding: false,
            slideHeight: 20,
            normalHeight: 40,
            animationFrame: 0,
            
            draw: () => {
                // Body with animation
                const bodyColor = this.activePowerups.shield.active ? '#4A90E2' : '#FF8C00';
                this.ctx.fillStyle = bodyColor;
                
                // Animated running effect
                const bobOffset = Math.sin(this.frames * 0.2) * 3;
                const currentHeight = this.isSliding ? this.slideHeight : this.normalHeight;
                
                this.ctx.fillRect(this.x, this.y + bobOffset, this.width, currentHeight);
                
                // Spots with animation
                this.ctx.fillStyle = '#000';
                const spotOffset = Math.sin(this.frames * 0.3) * 2;
                
                this.ctx.fillRect(this.x + 15 + spotOffset, this.y + 10, 8, 8);
                this.ctx.fillRect(this.x + 35 - spotOffset, this.y + 5, 8, 8);
                this.ctx.fillRect(this.x + 45 + spotOffset, this.y + 15, 8, 8);
                
                // Face
                this.ctx.fillRect(this.x + 5, this.y + 15, 10, 5); // Eye
                this.ctx.fillRect(this.x - 5, this.y + 20, 10, 3); // Ear
                
                // Tail with animation
                this.ctx.beginPath();
                this.ctx.moveTo(this.x + this.width, this.y + currentHeight / 2);
                this.ctx.lineTo(this.x + this.width + 20, this.y + currentHeight / 2 + Math.sin(this.frames * 0.4) * 10);
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            },
            
            jump: () => {
                if (!this.isSliding) {
                    this.velocity = this.jumpStrength;
                    this.playSound('jump');
                }
            },
            
            slide: () => {
                this.isSliding = true;
                setTimeout(() => {
                    this.isSliding = false;
                }, 1000);
            },
            
            update: () => {
                // Apply gravity
                this.velocity += this.gravity;
                this.y += this.velocity;
                
                // Floor collision
                const groundLevel = this.canvas.height - 40;
                if (this.y + (this.isSliding ? this.slideHeight : this.normalHeight) > groundLevel) {
                    this.y = groundLevel - (this.isSliding ? this.slideHeight : this.normalHeight);
                    if (this.velocity > 0) this.velocity = 0;
                }
                
                // Ceiling collision
                if (this.y < 0) {
                    this.y = 0;
                    this.velocity = 0;
                }
            }
        };

        // Game objects
        this.obstacles = [];
        this.powerups = [];
        this.backgroundElements = [];
        
        this.initBackground();
    }

    initBackground() {
        // Create clouds and background elements
        for (let i = 0; i < 5; i++) {
            this.backgroundElements.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * 100 + 20,
                width: 60 + Math.random() * 40,
                speed: 0.5 + Math.random() * 1,
                type: 'cloud'
            });
        }
    }

    setupEventListeners() {
        // Game controls
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning) return;
            
            switch(e.code) {
                case 'Space':
                case 'ArrowUp':
                    e.preventDefault();
                    this.cheetah.jump();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.cheetah.slide();
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.activateSpeedBoost();
                    break;
            }
        });

        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameRunning) {
                this.cheetah.jump();
            }
        });

        // UI event listeners
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('high-scores-btn').addEventListener('click', () => this.showHighScores());
        document.getElementById('how-to-play-btn').addEventListener('click', () => this.showScreen('how-to-play-screen'));
        document.getElementById('back-from-help-btn').addEventListener('click', () => this.showScreen('start-screen'));
        document.getElementById('back-from-scores-btn').addEventListener('click', () => this.showScreen('start-screen'));
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        document.getElementById('menu-btn').addEventListener('click', () => this.showScreen('start-screen'));
        document.getElementById('submit-score-btn').addEventListener('click', () => this.submitScore());
        
        // Enter key for player name input
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitScore();
            }
        });
    }

    loadAssets() {
        // Sound elements
        this.sounds = {
            jump: document.getElementById('jump-sound'),
            score: document.getElementById('score-sound'),
            crash: document.getElementById('crash-sound'),
            powerup: document.getElementById('powerup-sound'),
            music: document.getElementById('game-music')
        };

        // Set volume
        Object.values(this.sounds).forEach(sound => {
            if (sound) sound.volume = 0.3;
        });
        if (this.sounds.music) this.sounds.music.volume = 0.2;
    }

    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(screenId).classList.add('active');
        
        // Special handling for specific screens
        if (screenId === 'high-scores-screen') {
            this.loadHighScores();
        } else if (screenId === 'start-screen') {
            this.updateGlobalStats();
        }
    }

    async updateGlobalStats() {
        try {
            const totalPlayers = await gameDB.getTotalPlayers();
            document.getElementById('global-players').textContent = 
                totalPlayers > 1000 ? Math.floor(totalPlayers / 1000) + 'k+' : totalPlayers;
        } catch (error) {
            console.error('Error updating global stats:', error);
        }
    }

    startGame() {
        this.init();
        this.gameRunning = true;
        this.showScreen('game-screen');
        this.playSound('music');
        this.gameLoop();
        
        // Load personal best
        gameDB.getPersonalBest().then(best => {
            this.personalBest = best;
        });
    }

    createObstacle() {
        const types = ['cactus', 'rock', 'bird'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        if (type === 'bird') {
            this.obstacles.push({
                x: this.canvas.width,
                y: Math.random() * 150 + 50,
                width: 40,
                height: 30,
                type: 'bird',
                speedY: (Math.random() - 0.5) * 4,
                passed: false
            });
        } else {
            const gap = 150;
            const minHeight = 50;
            const maxHeight = this.canvas.height - gap - minHeight - 40;
            
            const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
            
            this.obstacles.push({
                x: this.canvas.width,
                topHeight: topHeight,
                bottomHeight: this.canvas.height - topHeight - gap - 40,
                width: 40,
                gap: gap,
                type: type,
                passed: false
            });
        }
    }

    createPowerup() {
        const types = [
            { type: 'speedBoost', color: '#FFD700', symbol: '⚡' },
            { type: 'shield', color: '#00FF00', symbol: '🛡️' },
            { type: 'doublePoints', color: '#FF6B6B', symbol: '2×' }
        ];
        
        const powerup = types[Math.floor(Math.random() * types.length)];
        
        this.powerups.push({
            x: this.canvas.width,
            y: Math.random() * (this.canvas.height - 100) + 50,
            width: 30,
            height: 30,
            ...powerup,
            passed: false
        });
    }

    activatePowerup(type) {
        this.activePowerups[type].active = true;
        this.activePowerups[type].duration = this.activePowerups[type].maxDuration;
        this.playSound('powerup');
        this.updatePowerupIndicators();
    }

    updatePowerupIndicators() {
        Object.keys(this.activePowerups).forEach(powerupType => {
            const indicator = document.getElementById(`${powerupType}-indicator`);
            const powerup = this.activePowerups[powerupType];
            
            if (powerup.active) {
                indicator.classList.remove('hidden');
                const timer = indicator.querySelector('.powerup-timer');
                timer.style.width = '100%';
            } else {
                indicator.classList.add('hidden');
            }
        });
    }

    updatePowerups() {
        Object.keys(this.activePowerups).forEach(powerupType => {
            const powerup = this.activePowerups[powerupType];
            
            if (powerup.active) {
                powerup.duration--;
                
                // Update timer visual
                const indicator = document.getElementById(`${powerupType}-indicator`);
                if (indicator && !indicator.classList.contains('hidden')) {
                    const timer = indicator.querySelector('.powerup-timer');
                    const percentage = (powerup.duration / powerup.maxDuration) * 100;
                    timer.style.width = percentage + '%';
                }
                
                if (powerup.duration <= 0) {
                    powerup.active = false;
                    this.updatePowerupIndicators();
                }
            }
        });
    }

    drawBackground() {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Clouds
        this.backgroundElements.forEach(cloud => {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(cloud.x, cloud.y, cloud.width / 3, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + cloud.width / 3, cloud.y - 10, cloud.width / 4, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + cloud.width / 2, cloud.y, cloud.width / 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Move clouds
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.width < 0) {
                cloud.x = this.canvas.width;
            }
        });

        // Ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvas.height - 40, this.canvas.width, 40);
        
        // Grass
        this.ctx.fillStyle = '#32CD32';
        this.ctx.fillRect(0, this.canvas.height - 40, this.canvas.width, 5);
        
        // Ground pattern
        this.ctx.fillStyle = '#A0522D';
        for (let i = 0; i < this.canvas.width; i += 20) {
            this.ctx.fillRect(i, this.canvas.height - 35, 10, 3);
        }
    }

    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            if (obstacle.type === 'bird') {
                // Draw bird
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Bird wings (animated)
                this.ctx.fillStyle = '#CC0000';
                const wingOffset = Math.sin(this.frames * 0.3) * 5;
                this.ctx.fillRect(obstacle.x - 10, obstacle.y + 10 + wingOffset, 15, 8);
            } else {
                // Draw cactus or rock
                this.ctx.fillStyle = obstacle.type === 'cactus' ? '#228B22' : '#666';
                
                // Top obstacle
                this.ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.topHeight);
                
                // Bottom obstacle
                this.ctx.fillRect(
                    obstacle.x, 
                    this.canvas.height - obstacle.bottomHeight - 40, 
                    obstacle.width, 
                    obstacle.bottomHeight
                );
                
                // Cactus details
                if (obstacle.type === 'cactus') {
                    this.ctx.fillStyle = '#1A6B1A';
                    this.ctx.fillRect(obstacle.x + 5, 10, 5, obstacle.topHeight - 10);
                    this.ctx.fillRect(obstacle.x + 15, 15, 5, obstacle.topHeight - 20);
                }
            }
        });
    }

    drawPowerups() {
        this.powerups.forEach(powerup => {
            this.ctx.fillStyle = powerup.color;
            this.ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
            
            // Power-up symbol
            this.ctx.fillStyle = '#000';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(powerup.symbol, powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);
        });
    }

    updateObstacles() {
        // Move obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.x -= this.gameSpeed + (this.activePowerups.speedBoost.active ? 3 : 0);
            
            // Move birds up and down
            if (obstacle.type === 'bird') {
                obstacle.y += obstacle.speedY;
                if (obstacle.y < 50 || obstacle.y > 200) {
                    obstacle.speedY *= -1;
                }
            }
            
            // Check if passed
            if (!obstacle.passed && obstacle.x + obstacle.width < this.cheetah.x) {
                const points = this.activePowerups.doublePoints.active ? 2 : 1;
                this.score += points;
                obstacle.passed = true;
                this.updateScoreDisplay();
                this.playSound('score');
            }
            
            // Check collision
            if (!this.activePowerups.shield.active && this.checkCollision(obstacle)) {
                this.loseLife();
            }
        });
        
        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(obs => obs.x + obs.width > 0);
    }

    updatePowerupsCollection() {
        this.powerups.forEach((powerup, index) => {
            powerup.x -= this.gameSpeed;
            
            // Check collection
            if (this.checkPowerupCollection(powerup)) {
                this.activatePowerup(powerup.type);
                this.powerups.splice(index, 1);
            }
        });
        
        // Remove off-screen powerups
        this.powerups = this.powerups.filter(p => p.x + p.width > 0);
    }

    checkCollision(obstacle) {
        if (obstacle.type === 'bird') {
            return (
                this.cheetah.x < obstacle.x + obstacle.width &&
                this.cheetah.x + this.cheetah.width > obstacle.x &&
                this.cheetah.y < obstacle.y + obstacle.height &&
                this.cheetah.y + (this.cheetah.isSliding ? this.cheetah.slideHeight : this.cheetah.normalHeight) > obstacle.y
            );
        } else {
            return (
                this.cheetah.x < obstacle.x + obstacle.width &&
                this.cheetah.x + this.cheetah.width > obstacle.x &&
                (this.cheetah.y < obstacle.topHeight || 
                 this.cheetah.y + (this.cheetah.isSliding ? this.cheetah.slideHeight : this.cheetah.normalHeight) > this.canvas.height - obstacle.bottomHeight - 40)
            );
        }
    }

    checkPowerupCollection(powerup) {
        return (
            this.cheetah.x < powerup.x + powerup.width &&
            this.cheetah.x + this.cheetah.width > powerup.x &&
            this.cheetah.y < powerup.y + powerup.height &&
            this.cheetah.y + (this.cheetah.isSliding ? this.cheetah.slideHeight : this.cheetah.normalHeight) > powerup.y
        );
    }

    loseLife() {
        this.lives--;
        this.playSound('crash');
        this.updateLivesDisplay();
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Brief invincibility after hit
            this.activePowerups.shield.active = true;
            this.activePowerups.shield.duration = 60; // 1 second
            this.updatePowerupIndicators();
        }
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('distance').textContent = Math.floor(this.distance);
    }

    updateLivesDisplay() {
        const livesElements = document.querySelectorAll('.life');
        livesElements.forEach((life, index) => {
            life.textContent = index < this.lives ? '❤️' : '♡';
        });
    }

    gameOver() {
        this.gameRunning = false;
        this.playSound('crash');
        this.sounds.music.pause();
        
        // Update final score display
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-distance').textContent = Math.floor(this.distance) + 'm';
        document.getElementById('personal-best').textContent = this.personalBest;
        
        // Check for new high score
        const isNewHighScore = this.score > this.personalBest;
        if (isNewHighScore) {
            document.getElementById('new-high-score').classList.remove('hidden');
            document.getElementById('player-name-section').classList.remove('hidden');
        } else {
            document.getElementById('new-high-score').classList.add('hidden');
            document.getElementById('player-name-section').classList.add('hidden');
        }
        
        this.showScreen('game-over-screen');
    }

    async submitScore() {
        const playerName = document.getElementById('player-name').value.trim() || 'Anonymous';
        
        if (this.score > 0) {
            await gameDB.submitScore(playerName, this.score, Math.floor(this.distance));
            document.getElementById('player-name-section').classList.add('hidden');
        }
    }

    async loadHighScores() {
        const scoresList = document.getElementById('scores-list');
        scoresList.innerHTML = '<div class="loading">Loading scores...</div>';
        
        const scores = await gameDB.getHighScores();
        
        if (scores.length === 0) {
            scoresList.innerHTML = '<div class="loading">No scores yet. Be the first!</div>';
            return;
        }
        
        scoresList.innerHTML = '';
        scores.forEach((score, index) => {
            const scoreElement = document.createElement('div');
            scoreElement.className = 'score-item';
            if (score.player_id === gameDB.playerId) {
                scoreElement.classList.add('highlight');
            }
            
            scoreElement.innerHTML = `
                <span class="score-rank">#${index + 1}</span>
                <span class="score-name">${score.player_name}</span>
                <span class="score-value">${score.score}</span>
            `;
            
            scoresList.appendChild(scoreElement);
        });
    }

    activateSpeedBoost() {
        if (!this.activePowerups.speedBoost.active) {
            this.activatePowerup('speedBoost');
        }
    }

    gameLoop() {
        if (!this.gameRunning) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game elements
        this.drawBackground();
        this.drawObstacles();
        this.drawPowerups();
        this.cheetah.draw();
        
        // Update game state
        this.cheetah.update();
        this.updateObstacles();
        this.updatePowerupsCollection();
        this.updatePowerups();
        
        // Increase difficulty
        this.frames++;
        this.distance += this.gameSpeed / 100;
        
        // Spawn obstacles
        if (this.frames % 120 === 0) { // Every 2 seconds at 60fps
            this.createObstacle();
        }
        
        // Spawn powerups (less frequent)
        if (this.frames % 300 === 0 && Math.random() < 0.3) {
            this.createPowerup();
        }
        
        // Gradually increase speed
        if (this.frames % 600 === 0) {
            this.gameSpeed += 0.5;
        }
        
        // Update displays
        this.updateScoreDisplay();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the game when page loads
window.addEventListener('load', () => {
    new CheetahDash();
});