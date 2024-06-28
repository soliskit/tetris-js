class GameCell {
  constructor(isFilled = false, color = null) {
    this.isFilled = isFilled;
    this.color = color;
  }
}

class Tetromino {
  constructor(shape, color, position = { row: 0, column: 0 }) {
    this.shape = shape;
    this.color = color;
    this.position = position;
    this.rotations = 0;
  }

  rotate(gameBoard) {
    const rotatedShape = this.shape[0].map((val, index) =>
      this.shape.map(row => row[index]).reverse()
    );

    const oldShape = this.shape;
    this.shape = rotatedShape;
    if (!this.fitsWithin(gameBoard)) {
      this.shape = oldShape;
    }
  }

  fitsWithin(gameBoard) {
    return this.shape.every((row, y) =>
      row.every((cell, x) =>
        !cell ||
        (gameBoard[y + this.position.row] &&
          gameBoard[y + this.position.row][x + this.position.column] &&
          !gameBoard[y + this.position.row][x + this.position.column].isFilled)
      )
    );
  }
}

class GameManager {
  constructor() {
    this.rows = 20;
    this.columns = 10;
    this.highScore = localStorage.getItem('highScore') || 0;
    this.isSessionSaved = false;
    this.timer = null;
    this.currentTetromino = this.generateTetromino();
    this.nextTetromino = this.generateTetromino();
    this.heldTetromino = null;
    this.canHoldTetromino = true;
    this.gameBoard = this.createBoard();
    this.state = 'gameOver';
    this.score = 0;
    this.level = 1;
    this.standardDropInterval = 700;
    this.quickDropInterval = this.standardDropInterval * 0.1;
  }

  createBoard() {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.columns }, () => new GameCell())
    );
  }

  generateTetromino() {
    const shapes = [
      [
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0],
      ],
      [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0],
      ],
      [
        [4, 4],
        [4, 4],
      ],
      [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0],
      ],
      [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0],
      ],
      [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ]
    ];
    const colors = ['cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'];
    const index = Math.floor(Math.random() * shapes.length);
    return new Tetromino(shapes[index], colors[index]);
  }

  resetGameSession() {
    this.state = 'paused';
    this.gameBoard = this.createBoard();
    this.score = 0;
    this.level = 1;
    this.currentTetromino = this.generateTetromino();
    this.nextTetromino = this.generateTetromino();
    this.heldTetromino = null;
    this.canHoldTetromino = true;
  }

  loadGameSession() {
    const savedGameSession = JSON.parse(localStorage.getItem('savedGameSession'));
    if (savedGameSession) {
      this.state = 'paused';
      this.gameBoard = savedGameSession.gameBoard.map(row =>
        row.map(cell => new GameCell(cell.isFilled, cell.color))
      );
      this.score = savedGameSession.score;
      this.level = savedGameSession.level;
      this.currentTetromino = Object.assign(new Tetromino(), savedGameSession.currentTetromino);
      this.nextTetromino = Object.assign(new Tetromino(), savedGameSession.nextTetromino);
      this.heldTetromino = savedGameSession.heldTetromino
        ? Object.assign(new Tetromino(), savedGameSession.heldTetromino)
        : null;
      this.canHoldTetromino = savedGameSession.canHoldTetromino;
    }
  }

  saveGameSession() {
    const gameSession = {
      gameBoard: this.gameBoard,
      score: this.score,
      level: this.level,
      currentTetromino: this.currentTetromino,
      nextTetromino: this.nextTetromino,
      heldTetromino: this.heldTetromino,
      canHoldTetromino: this.canHoldTetromino
    };
    localStorage.setItem('savedGameSession', JSON.stringify(gameSession));
    this.isSessionSaved = true;
  }

  generateNextTetromino() {
    this.currentTetromino = this.nextTetromino;
    this.nextTetromino = this.generateTetromino();
    this.canHoldTetromino = true;
    if (!this.isValidTetrominoPosition(this.currentTetromino, this.currentTetromino.position)) {
      this.state = 'gameOver';
      this.stopGameTimer();
    }
  }

  dropTetromino(isSoftDropping = false) {
    if (this.state !== 'playing') return;
    const newPosition = { row: this.currentTetromino.position.row + 1, column: this.currentTetromino.position.column };
    if (this.isValidTetrominoPosition(this.currentTetromino, newPosition)) {
      this.currentTetromino.position = newPosition;
    } else {
      this.lockTetrominoInPlace();
      this.clearFullRows();
      this.generateNextTetromino();
    }
    if (isSoftDropping) {
      this.startGameTimer(true);
    } else {
      this.startGameTimer();
    }
  }

  lockTetrominoInPlace() {
    this.currentTetromino.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const boardX = this.currentTetromino.position.column + x;
          const boardY = this.currentTetromino.position.row + y;
          if (this.gameBoard[boardY] && this.gameBoard[boardY][boardX]) {
            this.gameBoard[boardY][boardX] = new GameCell(true, this.currentTetromino.color);
          }
        }
      });
    });
  }

  clearFullRows() {
    const scores = [0, 100, 300, 500, 800];
    let completedLineCount = 0;
    this.gameBoard = this.gameBoard.filter(row => {
      if (row.every(cell => cell.isFilled)) {
        completedLineCount++;
        return false;
      }
      return true;
    });
    while (this.gameBoard.length < this.rows) {
      this.gameBoard.unshift(Array.from({ length: this.columns }, () => new GameCell()));
    }
    this.score += scores[completedLineCount];
    this.level = Math.floor(this.score / 1000) + 1;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('highScore', this.highScore);
    }
    this.saveGameSession();
  }

  isValidTetrominoPosition(tetromino, position) {
    return tetromino.shape.every((row, y) =>
      row.every((cell, x) =>
        !cell ||
        (this.gameBoard[y + position.row] &&
          this.gameBoard[y + position.row][x + position.column] &&
          !this.gameBoard[y + position.row][x + position.column].isFilled)
      )
    );
  }

  startGameTimer(withSoftDrop = false) {
    const interval = withSoftDrop ? this.quickDropInterval : this.standardDropInterval / this.level;
    this.stopGameTimer();
    this.timer = setInterval(() => this.updateGame(), interval);
  }

  stopGameTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  updateGame() {
    if (this.state === 'gameOver') return;
    this.dropTetromino();
  }

  handleAction(action) {
    switch (action) {
      case 'newGame':
        this.resetGameSession();
        this.state = 'playing';
        this.startGameTimer();
        break;
      case 'continueGame':
        this.loadGameSession();
        this.state = 'playing';
        this.startGameTimer();
        break;
      case 'pause':
        this.state = 'paused';
        this.stopGameTimer();
        this.saveGameSession();
        break;
      case 'resume':
        this.state = 'playing';
        this.startGameTimer();
        break;
      case 'moveLeft':
        this.moveTetromino(-1);
        break;
      case 'moveRight':
        this.moveTetromino(1);
        break;
      case 'hold':
        this.holdTetromino();
        break;
      case 'rotate':
        this.rotateTetromino();
        break;
      case 'drop':
        this.dropTetromino(true);
        break;
    }
  }

  moveTetromino(deltaX) {
    if (this.state !== 'playing') return;
    const newPosition = { row: this.currentTetromino.position.row, column: this.currentTetromino.position.column + deltaX };
    if (this.isValidTetrominoPosition(this.currentTetromino, newPosition)) {
      this.currentTetromino.position = newPosition;
    }
  }

  holdTetromino() {
    if (this.state !== 'playing' || !this.canHoldTetromino) return;
    const previousPosition = this.currentTetromino.position;
    if (this.heldTetromino) {
      [this.currentTetromino, this.heldTetromino] = [this.heldTetromino, this.currentTetromino];
      this.currentTetromino.position = previousPosition;
    } else {
      this.heldTetromino = this.currentTetromino;
      this.generateNextTetromino();
    }
    this.canHoldTetromino = false;
  }

  rotateTetromino() {
    if (this.state !== 'playing') return;
    this.currentTetromino.rotate(this.gameBoard);
  }
}

const gameManager = new GameManager();

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

context.scale(20, 20);

const colors = [
  null,
  'cyan',
  'blue',
  'orange',
  'yellow',
  'green',
  'purple',
  'red'
];

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(gameManager.currentTetromino.shape, {x: gameManager.currentTetromino.position.column, y: gameManager.currentTetromino.position.row});
  gameManager.gameBoard.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell.isFilled) {
        context.fillStyle = cell.color;
        context.fillRect(x, y, 1, 1);
      }
    });
  });
}

function update(time = 0) {
  draw();
  requestAnimationFrame(update);
}

document.getElementById('newGameButton').addEventListener('click', () => {
  gameManager.handleAction('newGame');
});

document.getElementById('continueGameButton').addEventListener('click', () => {
  gameManager.handleAction('continueGame');
});

document.getElementById('playPauseButton').addEventListener('click', () => {
  if (gameManager.state === 'playing') {
    gameManager.handleAction('pause');
  } else if (gameManager.state === 'paused') {
    gameManager.handleAction('resume');
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') {
    gameManager.handleAction('moveLeft');
  } else if (event.key === 'ArrowRight') {
    gameManager.handleAction('moveRight');
  } else if (event.key === 'ArrowDown') {
    gameManager.handleAction('drop');
  } else if (event.key === 'ArrowUp') {
    gameManager.handleAction('rotate');
  } else if (event.key === ' ') {
    gameManager.handleAction('hold');
  }
});

gameManager.handleAction('newGame');
update();
