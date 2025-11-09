class CheetahDash {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.init();
        this.loadAssets();
        this.showScreen('start-screen');
    }

    init() {
        // Game state
        this.gameRunning = false;
        this.score = 0;
        this.distance = 0;
        this.lives = 3;
        this.frames = 0;
        this.gameSpeed = 5;
        
        // Cheetah properties - SIMPLIFIED FOR VISIBILITY
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
            
            // SIMPLIFIED DRAWING - MAKES CHEETAH VISIBLE
            draw: () => {
                // Bright orange body - EASY TO SEE
                this.ctx.fillStyle = '#FF8C00';
                const currentHeight = this.isSliding ? this.slideHeight : this.normalHeight;
                this.ctx.fillRect(this.x, this.y, this.width, currentHeight);
                
                // Black spots for detail
                this.ctx.fillStyle = '#000';
                
                // Spots on body
                this.ctx.fillRect(this.x + 15, this.y + 10, 8, 8);
                this.ctx.fillRect(this.x + 35, this.y + 5, 8, 8);
                this.ctx.fillRect(this.x + 45, this.y + 15, 8, 8);
                
                // Face - simple features
                this.ctx.fillRect(this.x + 5, this.y + 15, 10, 5); // Eye
                this.ctx.fillRect(this.x - 5, this.y + 20, 10, 3); // Ear
                
                // Tail
                this.ctx.beginPath();
                this.ctx.moveTo(this.x + this.width, this.y + currentHeight / 2);
                this.ctx.lineTo(this.x + this.width + 20, this.y + currentHeight / 2);
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
        this.backgroundElements = [];
        
        this.initBackground();
    }

    initBackground() {
        // Create clouds
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
    }

    loadAssets() {
        // Sound elements
        this.sounds = {
            jump: document.getElementById('jump-sound'),
            score: document.getElementById('score-sound'),
            crash: document.getElementById('crash-sound')
        };

        // Set volume
        Object.values(this.sounds).forEach(sound => {
            if (sound) sound.volume = 0.3;
        });
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
    }

    startGame() {
        this.init();
        this.gameRunning = true;
        this.showScreen('game-screen');
        this.gameLoop();
    }

    createObstacle() {
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
            passed: false
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
    }

    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            // Draw cactus
            this.ctx.fillStyle = '#228B22';
            
            // Top obstacle
            this.ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.topHeight);
            
            // Bottom obstacle
            this.ctx.fillRect(
                obstacle.x, 
                this.canvas.height - obstacle.bottomHeight - 40, 
                obstacle.width, 
                obstacle.bottomHeight
            );
        });
    }

    updateObstacles() {
        // Move obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.x -= this.gameSpeed;
            
            // Check if passed
            if (!obstacle.passed && obstacle.x + obstacle.width < this.cheetah.x) {
                this.score += 1;
                obstacle.passed = true;
                this.updateScoreDisplay();
                this.playSound('score');
            }
            
            // Check collision
            if (this.checkCollision(obstacle)) {
                this.loseLife();
            }
        });
        
        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(obs => obs.x + obs.width > 0);
    }

    checkCollision(obstacle) {
        const cheetahHeight = this.cheetah.isSliding ? this.cheetah.slideHeight : this.cheetah.normalHeight;
        
        return (
            this.cheetah.x < obstacle.x + obstacle.width &&
            this.cheetah.x + this.cheetah.width > obstacle.x &&
            (this.cheetah.y < obstacle.topHeight || 
             this.cheetah.y + cheetahHeight > this.canvas.height - obstacle.bottomHeight - 40)
        );
    }

    loseLife() {
        this.lives--;
        this.playSound('crash');
        this.updateLivesDisplay();
        
        if (this.lives <= 0) {
            this.gameOver();
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
        
        // Update final score display
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-distance').textContent = Math.floor(this.distance) + 'm';
        
        this.showScreen('game-over-screen');
    }

    async loadHighScores() {
        // Simple placeholder - you can add Supabase back later
        const scoresList = document.getElementById('scores-list');
        scoresList.innerHTML = '<div class="loading">Local scores coming soon!</div>';
    }

    gameLoop() {
        if (!this.gameRunning) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game elements
        this.drawBackground();
        this.drawObstacles();
        this.cheetah.draw();
        
        // Update game state
        this.cheetah.update();
        this.updateObstacles();
        
        // Increase difficulty
        this.frames++;
        this.distance += this.gameSpeed / 100;
        
        // Spawn obstacles
        if (this.frames % 120 === 0) { // Every 2 seconds at 60fps
            this.createObstacle();
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