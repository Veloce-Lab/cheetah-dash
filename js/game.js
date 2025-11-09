class CheetahDash {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size based on container
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupEventListeners();
        this.difficulty = 'easy';
        this.init();
        this.loadAssets();
        this.showScreen('start-screen');
        this.loadHighScore();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth * 0.95;
        this.canvas.height = container.clientHeight * 0.7;
        this.initGameSettings(); // Reinitialize game settings when canvas resizes
    }

    initGameSettings() {
        // Difficulty settings
        this.difficultySettings = {
            easy: { speed: 4, obstacleFrequency: 150, gravity: 0.4 },
            medium: { speed: 6, obstacleFrequency: 120, gravity: 0.5 },
            hard: { speed: 8, obstacleFrequency: 90, gravity: 0.6 }
        };

        const settings = this.difficultySettings[this.difficulty];
        
        this.gameSpeed = settings.speed;
        this.obstacleFrequency = settings.obstacleFrequency;
    }

    init() {
        // Game state
        this.gameRunning = false;
        this.score = 0;
        this.distance = 0;
        this.lives = 3;
        this.frames = 0;
        this.highScore = parseInt(localStorage.getItem('cheetahDashHighScore') || '0');
        
        this.initGameSettings();

        // Cheetah properties
        this.cheetah = {
            x: this.canvas.width * 0.15,
            y: this.canvas.height / 2,
            width: Math.min(60, this.canvas.width * 0.08),
            height: Math.min(40, this.canvas.height * 0.1),
            velocity: 0,
            gravity: this.difficultySettings[this.difficulty].gravity,
            jumpStrength: -12,
            isSliding: false,
            slideHeight: Math.min(20, this.canvas.height * 0.05),
            normalHeight: Math.min(40, this.canvas.height * 0.1),
            isJumping: false,
            jumpPower: 0,
            
            draw: () => {
                // Bright orange body - Very visible
                this.ctx.fillStyle = '#FF8C00';
                const currentHeight = this.isSliding ? this.slideHeight : this.normalHeight;
                this.ctx.fillRect(this.x, this.y, this.width, currentHeight);
                
                // Black spots for detail
                this.ctx.fillStyle = '#000';
                
                // Spots on body
                this.ctx.fillRect(this.x + this.width * 0.25, this.y + currentHeight * 0.25, this.width * 0.13, this.width * 0.13);
                this.ctx.fillRect(this.x + this.width * 0.6, this.y + currentHeight * 0.12, this.width * 0.13, this.width * 0.13);
                this.ctx.fillRect(this.x + this.width * 0.75, this.y + currentHeight * 0.4, this.width * 0.13, this.width * 0.13);
                
                // Face
                this.ctx.fillRect(this.x + this.width * 0.08, this.y + currentHeight * 0.4, this.width * 0.17, currentHeight * 0.12); // Eye
                
                // Tail
                this.ctx.beginPath();
                this.ctx.moveTo(this.x + this.width, this.y + currentHeight / 2);
                this.ctx.lineTo(this.x + this.width + this.width * 0.3, this.y + currentHeight / 2);
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();

                // Draw cheetah face emoji when sliding (for fun)
                if (this.isSliding) {
                    this.ctx.font = `${this.width * 0.4}px Arial`;
                    this.ctx.fillText('😼', this.x + this.width * 0.1, this.y + currentHeight * 0.7);
                }
            },
            
            jump: (power = 1) => {
                if (!this.isSliding) {
                    this.velocity = this.jumpStrength * power;
                    this.isJumping = true;
                    this.playSound('jump');
                }
            },
            
            slide: () => {
                if (!this.isJumping) {
                    this.isSliding = true;
                    setTimeout(() => {
                        this.isSliding = false;
                    }, 800);
                }
            },
            
            update: () => {
                // Apply gravity
                this.velocity += this.gravity;
                this.y += this.velocity;
                
                // Floor collision
                const groundLevel = this.canvas.height - this.canvas.height * 0.1;
                const currentHeight = this.isSliding ? this.slideHeight : this.normalHeight;
                
                if (this.y + currentHeight > groundLevel) {
                    this.y = groundLevel - currentHeight;
                    this.velocity = 0;
                    this.isJumping = false;
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
                y: Math.random() * (this.canvas.height * 0.3) + 20,
                width: 60 + Math.random() * 40,
                speed: 0.5 + Math.random() * 1,
                type: 'cloud'
            });
        }
    }

    setupEventListeners() {
        // Keyboard controls
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

        // Touch controls
        let touchStartY = 0;
        let touchStartTime = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.gameRunning) return;
            
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            
            // Start jump with initial power
            this.cheetah.jump(0.8);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.gameRunning) return;
            
            const touchEndY = e.changedTouches[0].clientY;
            const touchDuration = Date.now() - touchStartTime;
            const swipeDistance = touchEndY - touchStartY;
            
            // If swipe down and significant distance, slide
            if (swipeDistance > 50 && touchDuration < 300) {
                this.cheetah.slide();
            }
            // If held for longer time, stronger jump
            else if (touchDuration > 200) {
                const power = Math.min(1.5, 0.8 + (touchDuration / 1000));
                this.cheetah.jump(power);
            }
        });

        // Mobile control buttons
        document.getElementById('jump-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameRunning) {
                this.cheetah.jump();
            }
        });

        document.getElementById('slide-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameRunning) {
                this.cheetah.slide();
            }
        });

        // UI event listeners
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('how-to-play-btn').addEventListener('click', () => this.showScreen('how-to-play-screen'));
        document.getElementById('back-from-help-btn').addEventListener('click', () => this.showScreen('start-screen'));
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        document.getElementById('menu-btn').addEventListener('click', () => this.showScreen('start-screen'));

        // Difficulty buttons
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.difficulty = e.target.dataset.difficulty;
                this.updateDifficultyBadge();
            });
        });
    }

    updateDifficultyBadge() {
        const badge = document.getElementById('difficulty-badge');
        badge.textContent = this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1);
        badge.className = 'difficulty-badge ' + this.difficulty;
    }

    loadAssets() {
        // Sound elements
        this.sounds = {
            jump: document.getElementById('jump-sound'),
            score: document.getElementById('score-sound'),
            crash: document.getElementById('crash-sound'),
            music: document.getElementById('game-music')
        };

        // Set volume
        Object.values(this.sounds).forEach(sound => {
            if (sound) sound.volume = 0.3;
        });
        if (this.sounds.music) this.sounds.music.volume = 0.1;
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

    loadHighScore() {
        document.getElementById('high-score').textContent = this.highScore;
    }

    startGame() {
        this.init();
        this.gameRunning = true;
        this.showScreen('game-screen');
        this.updateDifficultyBadge();
        this.updateLivesDisplay();
        this.updateScoreDisplay();
        
        if (this.sounds.music) {
            this.sounds.music.currentTime = 0;
            this.sounds.music.play();
        }
        
        this.gameLoop();
    }

    createObstacle() {
        const gap = this.canvas.height * 0.3; // 30% of canvas height
        const minHeight = this.canvas.height * 0.1;
        const maxHeight = this.canvas.height - gap - minHeight - this.canvas.height * 0.1;
        
        const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
        
        this.obstacles.push({
            x: this.canvas.width,
            topHeight: topHeight,
            bottomHeight: this.canvas.height - topHeight - gap - this.canvas.height * 0.1,
            width: Math.min(40, this.canvas.width * 0.05),
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
        this.ctx.fillRect(0, this.canvas.height - this.canvas.height * 0.1, this.canvas.width, this.canvas.height * 0.1);
        
        // Grass
        this.ctx.fillStyle = '#32CD32';
        this.ctx.fillRect(0, this.canvas.height - this.canvas.height * 0.1, this.canvas.width, this.canvas.height * 0.02);
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
                this.canvas.height - obstacle.bottomHeight - this.canvas.height * 0.1, 
                obstacle.width, 
                obstacle.bottomHeight
            );
            
            // Cactus spines
            this.ctx.fillStyle = '#1A6B1A';
            this.ctx.fillRect(obstacle.x + obstacle.width * 0.1, 10, obstacle.width * 0.2, obstacle.topHeight - 10);
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
        const groundLevel = this.canvas.height - this.canvas.height * 0.1;
        
        // Check if cheetah is within obstacle's x range
        const withinX = this.cheetah.x < obstacle.x + obstacle.width && 
                       this.cheetah.x + this.cheetah.width > obstacle.x;
        
        // Check if cheetah is colliding with top or bottom obstacle
        const hitTop = this.cheetah.y < obstacle.topHeight;
        const hitBottom = this.cheetah.y + cheetahHeight > groundLevel - obstacle.bottomHeight;
        
        return withinX && (hitTop || hitBottom);
    }

    loseLife() {
        this.lives--;
        this.playSound('crash');
        this.updateLivesDisplay();
        
        // Visual feedback
        this.shakeScreen();
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Brief invincibility
            setTimeout(() => {
                // Can add invincibility flash effect here
            }, 1000);
        }
    }

    shakeScreen() {
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.transform = 'translateX(10px)';
        setTimeout(() => {
            gameContainer.style.transform = 'translateX(-10px)';
            setTimeout(() => {
                gameContainer.style.transform = 'translateX(0)';
            }, 50);
        }, 50);
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('distance').textContent = Math.floor(this.distance);
    }

    updateLivesDisplay() {
        const livesElements = document.querySelectorAll('.life');
        livesElements.forEach((life, index) => {
            life.textContent = index < this.lives ? '❤️' : '💔';
        });
    }

    gameOver() {
        this.gameRunning = false;
        
        if (this.sounds.music) {
            this.sounds.music.pause();
        }
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('cheetahDashHighScore', this.highScore.toString());
        }
        
        // Update final score display
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-distance').textContent = Math.floor(this.distance) + 'm';
        document.getElementById('final-difficulty').textContent = this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1);
        
        this.showScreen('game-over-screen');
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
        
        // Spawn obstacles based on difficulty
        if (this.frames % this.obstacleFrequency === 0) {
            this.createObstacle();
        }
        
        // Gradually increase speed
        if (this.frames % 600 === 0) {
            this.gameSpeed += 0.2;
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