export default class DocumentUpdater {
    
    constructor(application) {
        this.application = application;
        this.startTime = new Date();
        
        this.timer = document.getElementById("timer");
        this.firstPlayerPointsContainer = document.getElementById("first-player-score");
        this.secondPlayerPointsContainer = document.getElementById("second-player-score");

        this.previousScores = {
            firstPlayer: 0,
            secondPlayer: 0
        };

        // Display the intro screen until the user presses a button
        this.introEventListener = function(event) {
            let intro = document.getElementById("intro");
            intro.parentElement.removeChild(intro);
            window.removeEventListener('keydown', this.introEventListener);

            // Only display game elements when user starts the game
            this.timer.style.display = "block";
            this.firstPlayerPointsContainer.style.display = "flex";
            this.secondPlayerPointsContainer.style.display = "flex";
            
            this.application.beforeStart();

            let countdownLeft = new Countdown(document.getElementById("countdown-left"), this.application.DEATH_TIMEOUT, function() {
                this.application.startGame();
                this.startTime = new Date();
            }.bind(this)).start();
            let countdownRight = new Countdown(document.getElementById("countdown-right"), this.application.DEATH_TIMEOUT).start();

        }.bind(this);
        window.addEventListener('keydown', this.introEventListener);
    }

    startCountdown(elementId, time, callback) {
        new Countdown(document.getElementById(elementId), time, callback).start();
    }

    endGame() {
        this.application.endGame();

        // Hide the user interface
        this.timer.style.display = "none";
        this.firstPlayerPointsContainer.style.display = "none";
        this.secondPlayerPointsContainer.style.display = "none";

        // Check who won
        let firstPlayerWon = this.previousScores.firstPlayer > this.previousScores.secondPlayer;
        let playerContainer = document.getElementById("player");
        if (firstPlayerWon) {
            playerContainer.innerHTML = "Left player";
            playerContainer.className = "first-won";
        } else {
            playerContainer.innerHTML = "Right player";
            playerContainer.className = "second-won";
        }
        
        // Display the end game screen
        document.getElementById("outro").style.display = "flex";
    }
    
    update() {
        let currentTime = new Date();
        let timeDifference = (currentTime - this.startTime) / 1000;

        if (timeDifference >= this.application.GAME_DURATION ||
            this.previousScores.firstPlayer >= this.application.NUMBER_OF_CHECKPOINTS ||
            this.previousScores.secondPlayer >= this.application.NUMBER_OF_CHECKPOINTS) {
            this.endGame();
            return;
        }

        this.updateTimer(timeDifference);
        this.updatePlayerScores();
    }

    updateTimer(delta) {
        let time = this.application.GAME_DURATION - delta;
        let minutes = Math.floor(time / 60);
        let seconds = Math.floor(time % 60);
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;
        this.timer.innerText = minutes + ":" + seconds;
    }

    createCheckpointElement(className) {
        let checkpoint = document.createElement('div');
        checkpoint.className = "checkpoint " + className;
        return checkpoint;
    }

    updatePlayerScores() {

        let newScores = this.application.playerScores;
        
        let newFirst = newScores.firstPlayer - this.previousScores.firstPlayer;
        if (newFirst < 0) {
            // Remove points
            for (let i = 0; i < Math.abs(newFirst); i++) {
                if (!this.firstPlayerPointsContainer.hasChildNodes)
                    break;
                this.firstPlayerPointsContainer.removeChild(this.firstPlayerPointsContainer.lastChild);
            }
        } else if (newFirst > 0) {
            // Add points
            for (let i = 0; i < newFirst; i++) {
                this.firstPlayerPointsContainer.appendChild(this.createCheckpointElement("first"));
            }
        }

        let newSecond = newScores.secondPlayer - this.previousScores.secondPlayer;
        if (newSecond < 0) {
            // Remove points
            for (let i = 0; i < Math.abs(newSecond); i++) {
                if (!this.secondPlayerPointsContainer.hasChildNodes)
                    break;
                this.secondPlayerPointsContainer.removeChild(this.secondPlayerPointsContainer.lastChild);
            }
        } else if (newSecond > 0) {
            // Add points
            for (let i = 0; i < newSecond; i++) {
                this.secondPlayerPointsContainer.appendChild(this.createCheckpointElement("second"));
            }
        }

        this.previousScores.firstPlayer = newScores.firstPlayer;
        this.previousScores.secondPlayer = newScores.secondPlayer;
    }

}

class Countdown {
    
    constructor(element, time, callback) {
        this.element = element;
        this.time = time;
        this.callback = callback;
        this.startTime = new Date();
    }

    start() {
        this.startTime = new Date();
        this.element.style.display = "block";
        this.interval = setInterval(this.update.bind(this), 1000 / 30);
    }

    update() {
        let now = new Date();
        let timeDifference = (now - this.startTime) / 1000;

        if (timeDifference >= this.time) {
            this.element.style.display = "none";
            if (this.callback)
                this.callback();
            if (this.interval)
                clearInterval(this.interval);
            return;
        }

        this.element.innerHTML = Math.ceil(this.time - timeDifference);
    }

}