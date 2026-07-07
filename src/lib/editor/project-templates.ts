/**
 * Project Templates — multi-file boilerplate generators
 *
 * Each template creates a complete project structure with multiple files.
 * Used by "New Project from Template" feature.
 */

export interface ProjectTemplateFile {
  name: string
  content: string
  subPath?: string // e.g., "src/components" — will create folder structure
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: 'web' | 'game' | 'app' | 'indo' | 'utility'
  files: ProjectTemplateFile[]
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'static-website',
    name: 'Static Website',
    description: 'HTML + CSS + JS dengan struktur proper',
    icon: '🌐',
    category: 'web',
    files: [
      {
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Website modern dengan struktur proper">
  <title>My Website</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
</head>
<body>
  <header class="header">
    <nav class="nav container">
      <a href="/" class="logo">MySite</a>
      <ul class="nav-links">
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main class="main">
    <section id="home" class="hero">
      <div class="container">
        <h1>Selamat Datang</h1>
        <p>Website modern dengan struktur proper, responsive, dan accessible.</p>
        <button class="btn btn-primary" id="cta-btn">Get Started</button>
      </div>
    </section>

    <section id="about" class="about">
      <div class="container">
        <h2>About</h2>
        <p>Konten about section di sini.</p>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container">
      <p>&copy; 2025 MySite. All rights reserved.</p>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>
`,
      },
      {
        name: 'styles.css',
        content: `/* === CSS Variables === */
:root {
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-bg: #ffffff;
  --color-text: #1f2937;
  --color-muted: #6b7280;
  --color-border: #e5e7eb;
  --container-max: 1200px;
  --spacing: 1rem;
  --radius: 0.5rem;
  --transition: 0.2s ease;
}

/* === Reset === */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
}

/* === Layout === */
.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--spacing);
}

/* === Header === */
.header {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
  z-index: 100;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-primary);
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  list-style: none;
}

.nav-links a {
  color: var(--color-text);
  text-decoration: none;
  transition: color var(--transition);
}

.nav-links a:hover {
  color: var(--color-primary);
}

/* === Hero === */
.hero {
  padding: 4rem 0;
  text-align: center;
  background: linear-gradient(135deg, #f3f4f6 0%, #e0e7ff 100%);
}

.hero h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.125rem;
  color: var(--color-muted);
  margin-bottom: 2rem;
}

/* === Button === */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* === Footer === */
.footer {
  padding: 2rem 0;
  background: #f9fafb;
  border-top: 1px solid var(--color-border);
  text-align: center;
  color: var(--color-muted);
  font-size: 0.875rem;
}

/* === Responsive === */
@media (max-width: 768px) {
  .nav-links {
    gap: 1rem;
  }
  
  .hero {
    padding: 2rem 0;
  }
}
`,
      },
      {
        name: 'script.js',
        content: `// Main JavaScript — Static Website
// IIFE untuk avoid polluting global scope
(function() {
  'use strict';

  // === Smooth scroll untuk nav links ===
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // === CTA Button interaction ===
  const ctaBtn = document.getElementById('cta-btn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      alert('Thanks for clicking! Implement your action here.');
    });
  }

  // === Header shadow on scroll ===
  const header = document.querySelector('.header');
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 10) {
      header.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
    } else {
      header.style.boxShadow = 'none';
    }
    lastScroll = currentScroll;
  });

  console.log('Website loaded successfully');
})();
`,
      },
    ],
  },
  {
    id: 'canvas-game',
    name: 'Canvas Game Starter',
    description: 'Game loop, score, collision, particles',
    icon: '🎮',
    category: 'game',
    files: [
      {
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canvas Game</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="game-container">
    <div class="hud">
      <div class="score">Score: <span id="score">0</span></div>
      <div class="high-score">High: <span id="highScore">0</span></div>
    </div>
    <canvas id="game" width="800" height="600"></canvas>
    <div class="controls">
      <button id="startBtn">Start</button>
      <button id="pauseBtn">Pause</button>
      <button id="resetBtn">Reset</button>
    </div>
    <div class="instructions">
      <p>Arrow keys / WASD to move · Space to pause</p>
    </div>
  </div>
  <script src="game.js"></script>
</body>
</html>
`,
      },
      {
        name: 'style.css',
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0f0f1e;
  color: #fff;
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.hud {
  display: flex;
  gap: 2rem;
  font-size: 1.25rem;
  font-weight: bold;
}

#score { color: #4ade80; }
#highScore { color: #fbbf24; }

#game {
  background: #1a1a2e;
  border: 2px solid #4c4c6a;
  border-radius: 8px;
  box-shadow: 0 0 40px rgba(99, 102, 241, 0.2);
}

.controls {
  display: flex;
  gap: 0.5rem;
}

.controls button {
  padding: 0.5rem 1.5rem;
  background: #4c4c6a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.controls button:hover {
  background: #6366f1;
}

.instructions {
  color: #6b7280;
  font-size: 0.875rem;
}
`,
      },
      {
        name: 'game.js',
        content: `// Canvas Game Starter — Production-grade game framework
// Features: game loop, score, high score (localStorage), pause, particles, collision

(function() {
  'use strict';

  // === Configuration ===
  const CONFIG = {
    width: 800,
    height: 600,
    playerSpeed: 5,
    particleCount: 20,
  };

  // === State ===
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');

  let state = 'menu'; // menu | playing | paused | gameover
  let score = 0;
  let highScore = parseInt(localStorage.getItem('gameHighScore') || '0');
  let lastTime = 0;
  let animationId = null;

  // Player
  const player = {
    x: CONFIG.width / 2,
    y: CONFIG.height / 2,
    size: 20,
    color: '#4ade80',
    vx: 0,
    vy: 0,
  };

  // Collectibles
  let collectibles = [];
  // Particles
  let particles = [];
  // Input
  const keys = {};

  // === Init ===
  function init() {
    highScoreEl.textContent = highScore;
    spawnCollectible();
    setupInput();
    setupButtons();
    draw();
  }

  function setupInput() {
    document.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' && state === 'playing') {
        e.preventDefault();
        togglePause();
      }
    });
    document.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });
  }

  function setupButtons() {
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    resetBtn.addEventListener('click', resetGame);
  }

  function startGame() {
    state = 'playing';
    score = 0;
    scoreEl.textContent = score;
    player.x = CONFIG.width / 2;
    player.y = CONFIG.height / 2;
    collectibles = [];
    spawnCollectible();
    lastTime = performance.now();
    if (animationId) cancelAnimationFrame(animationId);
    loop(lastTime);
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      cancelAnimationFrame(animationId);
    } else if (state === 'paused') {
      state = 'playing';
      lastTime = performance.now();
      loop(lastTime);
    }
  }

  function resetGame() {
    state = 'menu';
    score = 0;
    scoreEl.textContent = score;
    collectibles = [];
    particles = [];
    if (animationId) cancelAnimationFrame(animationId);
    draw();
  }

  // === Game Loop ===
  function loop(time) {
    const dt = (time - lastTime) / 16.67; // normalize to 60fps
    lastTime = time;

    update(dt);
    draw();

    if (state === 'playing') {
      animationId = requestAnimationFrame(loop);
    }
  }

  function update(dt) {
    // Player movement
    player.vx = 0;
    player.vy = 0;
    if (keys['arrowleft'] || keys['a']) player.vx = -CONFIG.playerSpeed;
    if (keys['arrowright'] || keys['d']) player.vx = CONFIG.playerSpeed;
    if (keys['arrowup'] || keys['w']) player.vy = -CONFIG.playerSpeed;
    if (keys['arrowdown'] || keys['s']) player.vy = CONFIG.playerSpeed;

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Boundary collision
    player.x = Math.max(player.size, Math.min(CONFIG.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(CONFIG.height - player.size, player.y));

    // Collectible collision
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      const dx = player.x - c.x;
      const dy = player.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < player.size + c.size) {
        collectibles.splice(i, 1);
        score += 10;
        scoreEl.textContent = score;
        spawnParticles(c.x, c.y, c.color);
        spawnCollectible();
        
        if (score > highScore) {
          highScore = score;
          highScoreEl.textContent = highScore;
          localStorage.setItem('gameHighScore', highScore.toString());
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function spawnCollectible() {
    collectibles.push({
      x: Math.random() * (CONFIG.width - 40) + 20,
      y: Math.random() * (CONFIG.height - 40) + 20,
      size: 10,
      color: '#fbbf24',
    });
  }

  function spawnParticles(x, y, color) {
    for (let i = 0; i < CONFIG.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / CONFIG.particleCount;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30,
        color,
        size: 3 + Math.random() * 2,
      });
    }
  }

  // === Render ===
  function draw() {
    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // Grid (subtle)
    ctx.strokeStyle = 'rgba(76, 76, 106, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CONFIG.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CONFIG.height);
      ctx.stroke();
    }
    for (let y = 0; y < CONFIG.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CONFIG.width, y);
      ctx.stroke();
    }

    // Collectibles
    collectibles.forEach(c => {
      ctx.fillStyle = c.color;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Player
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Particles
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // State overlays
    if (state === 'menu') {
      drawCenterText('Press Start', '#fff', 32);
    } else if (state === 'paused') {
      drawCenterText('PAUSED', '#fbbf24', 40);
    }
  }

  function drawCenterText(text, color, size) {
    ctx.fillStyle = color;
    ctx.font = \`bold \${size}px system-ui\`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CONFIG.width / 2, CONFIG.height / 2);
  }

  // === Start ===
  init();
})();
`,
      },
    ],
  },
  {
    id: 'todo-app',
    name: 'Todo App',
    description: 'CRUD + filter + localStorage persistence',
    icon: '✅',
    category: 'app',
    files: [
      {
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app">
    <header class="app-header">
      <h1>✅ Todo App</h1>
      <p class="subtitle">Kelola tugas harian dengan mudah</p>
    </header>

    <main class="main">
      <!-- Add form -->
      <form id="todo-form" class="todo-form">
        <input
          type="text"
          id="todo-input"
          placeholder="Tambah tugas baru..."
          maxlength="200"
          autocomplete="off"
          required
        >
        <select id="priority-select">
          <option value="low">Low</option>
          <option value="med" selected>Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit">Add</button>
      </form>

      <!-- Filters -->
      <div class="filters">
        <button class="filter-btn active" data-filter="all">All (<span id="count-all">0</span>)</button>
        <button class="filter-btn" data-filter="active">Active (<span id="count-active">0</span>)</button>
        <button class="filter-btn" data-filter="completed">Done (<span id="count-completed">0</span>)</button>
      </div>

      <!-- Search -->
      <input type="search" id="search-input" placeholder="Cari tugas..." class="search-input">

      <!-- Todo list -->
      <ul id="todo-list" class="todo-list"></ul>

      <!-- Empty state -->
      <div id="empty-state" class="empty-state">
        <p>Belum ada tugas. Tambahkan yang pertama!</p>
      </div>

      <!-- Bulk actions -->
      <div class="bulk-actions">
        <button id="clear-completed">Clear Completed</button>
        <button id="clear-all">Clear All</button>
      </div>
    </main>

    <footer class="app-footer">
      <p>Total: <span id="total-count">0</span> · Completed: <span id="completed-count">0</span></p>
    </footer>
  </div>

  <script src="app.js"></script>
</body>
</html>
`,
      },
      {
        name: 'style.css',
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --bg: #f3f4f6;
  --card: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --border: #e5e7eb;
  --danger: #ef4444;
  --success: #10b981;
  --warning: #f59e0b;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding: 1rem;
}

.app {
  max-width: 600px;
  margin: 0 auto;
  background: var(--card);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  overflow: hidden;
}

.app-header {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  padding: 2rem 1.5rem;
  text-align: center;
}

.app-header h1 { font-size: 1.75rem; }
.subtitle { opacity: 0.9; margin-top: 0.25rem; font-size: 0.875rem; }

.main { padding: 1.5rem; }

.todo-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.todo-form input[type="text"] {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
}

.todo-form select {
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: white;
}

.todo-form button {
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.todo-form button:hover { background: var(--primary-dark); }

.filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.filter-btn {
  flex: 1;
  padding: 0.5rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.filter-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.search-input {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.todo-list { list-style: none; }

.todo-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
}

.todo-item:hover { border-color: var(--primary); }

.todo-item.completed { opacity: 0.6; }
.todo-item.completed .todo-text { text-decoration: line-through; }

.todo-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.todo-text {
  flex: 1;
  font-size: 0.875rem;
}

.todo-priority {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.priority-high { background: #fee2e2; color: var(--danger); }
.priority-med { background: #fef3c7; color: var(--warning); }
.priority-low { background: #d1fae5; color: var(--success); }

.todo-delete {
  background: transparent;
  border: none;
  color: var(--danger);
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1.25rem;
  opacity: 0.5;
}

.todo-delete:hover { opacity: 1; }

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--muted);
  display: none;
}

.empty-state.show { display: block; }

.bulk-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: flex-end;
}

.bulk-actions button {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--muted);
}

.bulk-actions button:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.app-footer {
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-top: 1px solid var(--border);
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted);
}
`,
      },
      {
        name: 'app.js',
        content: `// Todo App — Production-grade with localStorage persistence
// Features: CRUD, filter (all/active/completed), search, priority, bulk actions

(function() {
  'use strict';

  const STORAGE_KEY = 'todo-app-tasks';
  
  // === State ===
  let tasks = [];
  let currentFilter = 'all';
  let searchQuery = '';

  // === DOM ===
  const form = document.getElementById('todo-form');
  const input = document.getElementById('todo-input');
  const prioritySelect = document.getElementById('priority-select');
  const list = document.getElementById('todo-list');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const clearAllBtn = document.getElementById('clear-all');

  // === Persistence ===
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch {
      tasks = [];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // === CRUD ===
  function addTask(text, priority) {
    const task = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text: text.trim(),
      priority,
      completed: false,
      createdAt: Date.now(),
    };
    tasks.unshift(task);
    saveTasks();
    render();
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      render();
    }
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }

  function clearCompleted() {
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    render();
  }

  function clearAll() {
    if (tasks.length === 0) return;
    if (confirm(\`Hapus semua \${tasks.length} tugas?\`)) {
      tasks = [];
      saveTasks();
      render();
    }
  }

  // === Filter & Search ===
  function getFilteredTasks() {
    return tasks.filter(t => {
      // Filter
      if (currentFilter === 'active' && t.completed) return false;
      if (currentFilter === 'completed' && !t.completed) return false;
      // Search
      if (searchQuery && !t.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }

  // === Render ===
  function render() {
    const filtered = getFilteredTasks();
    
    // List
    list.innerHTML = filtered.map(task => \`
      <li class="todo-item \${task.completed ? 'completed' : ''}" data-id="\${task.id}">
        <input type="checkbox" class="todo-checkbox" \${task.completed ? 'checked' : ''}>
        <span class="todo-text">\${escapeHtml(task.text)}</span>
        <span class="todo-priority priority-\${task.priority}">\${task.priority.toUpperCase()}</span>
        <button class="todo-delete" data-action="delete">×</button>
      </li>
    \`).join('');

    // Empty state
    emptyState.classList.toggle('show', filtered.length === 0);

    // Counts
    const counts = {
      all: tasks.length,
      active: tasks.filter(t => !t.completed).length,
      completed: tasks.filter(t => t.completed).length,
    };
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-active').textContent = counts.active;
    document.getElementById('count-completed').textContent = counts.completed;
    document.getElementById('total-count').textContent = counts.all;
    document.getElementById('completed-count').textContent = counts.completed;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // === Event Listeners ===
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addTask(text, prioritySelect.value);
    input.value = '';
    input.focus();
  });

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const id = item.dataset.id;
    
    if (e.target.classList.contains('todo-checkbox')) {
      toggleTask(id);
    } else if (e.target.dataset.action === 'delete') {
      deleteTask(id);
    }
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
  });

  clearCompletedBtn.addEventListener('click', clearCompleted);
  clearAllBtn.addEventListener('click', clearAll);

  // === Init ===
  loadTasks();
  render();
})();
`,
      },
    ],
  },
  {
    id: 'indo-game',
    name: 'IndoCode Game',
    description: 'Game ular pakai bahasa Indonesia',
    icon: '🐍',
    category: 'indo',
    files: [
      {
        name: 'game_ular.indo',
        content: `// Game Uular — IndoCode
// Pakai keyword bahasa Indonesia

konstanta kanvas = ambilElemen("game")
konstanta ctx = kanvas.konteks("2d")

variabel ular = [{x: 200, y: 200}]
variabel makanan = {x: 100, y: 100}
variabel skor = 0
variabel arah = "kanan"
variabel gameSelesai = salah

// Warna
konstanta warnaUlar = "#4ade80"
konstanta warnaMakanan = "#fbbf24"
konstanta warnaBg = "#1a1a2e"

fungsi gambar() {
  // Bersihkan kanvas
  ctx.warnaIsi = warnaBg
  ctx.kotak(0, 0, kanvas.lebar, kanvas.tinggi)

  // Gambar makanan
  ctx.warnaIsi = warnaMakanan
  ctx.kotak(makanan.x, makanan.y, 20, 20)

  // Gambar ular
  ctx.warnaIsi = warnaUlar
  untuk (variabel bagian dari ular) {
    ctx.kotak(bagian.x, bagian.y, 20, 20)
  }
}

fungsi update() {
  kalau (gameSelesai) kembalikan

  // Gerakkan ular
  variabel kepala = {x: ular[0].x, y: ular[0].y}

  kalau (arah === "kanan") kepala.x += 20
  kalau (arah === "kiri") kepala.x -= 20
  kalau (arah === "atas") kepala.y -= 20
  kalau (arah === "bawah") kepala.y += 20

  // Tabrakan dinding
  kalau (kepala.x < 0 || kepala.x >= kanvas.lebar || kepala.y < 0 || kepala.y >= kanvas.tinggi) {
    gameSelesai = benar
    tampilkan("Game Selesai! Skor: " + skor)
    kembalikan
  }

  // Tabrakan badan sendiri
  untuk (variabel bagian dari ular) {
    kalau (kepala.x === bagian.x && kepala.y === bagian.y) {
      gameSelesai = benar
      tampilkan("Game Selesai! Skor: " + skor)
      kembalikan
    }
  }

  ular.dorong(kepala)

  // Makan makanan
  kalau (kepala.x === makanan.x && kepala.y === makanan.y) {
    skor += 10
    makanan.x = bulat(acak() * (kanvas.lebar / 20)) * 20
    makanan.y = bulat(acak() * (kanvas.tinggi / 20)) * 20
    tampilkan("Skor: " + skor)
  } kalau_tidak {
    ular.hapusBelakang()
  }
}

fungsi loop() {
  update()
  gambar()
  kalau (!gameSelesai) {
    bingkaiBerikutnya(loop)
  }
}

// Kontrol keyboard
dokumen.tambahEvent("keydown", fungsi(e) {
  kalau (e.kunci === "ArrowRight" && arah !== "kiri") arah = "kanan"
  kalau (e.kunci === "ArrowLeft" && arah !== "kanan") arah = "kiri"
  kalau (e.kunci === "ArrowUp" && arah !== "bawah") arah = "atas"
  kalau (e.kunci === "ArrowDown" && arah !== "atas") arah = "bawah"
})

// Mulai game
tampilkan("Mulai! Pakai arrow keys")
loop()
`,
      },
      {
        name: 'index.html',
        content: `<!tipe html>
<html bahasa="id">
<kepala>
  <meta setKarakter="UTF-8">
  <meta nama="viewport" konten="width=device-width, initial-scale=1.0">
  <judul>Game Uular - IndoCode</judul>
  <gaya>
    badan {
      latar: #1a1a2e;
      warna: #4ade80;
      keluargaFont: system-ui, sans-serif;
      tampilan: fleksibel;
      rataKonten: tengah;
      rataItem: tengah;
      tinggi: 100vh;
      margin: 0;
    }
    kanvas {
      batas: 4px solid #4ade80;
      radiusBatas: 8px;
      bayanganKotak: 0 0 40px rgba(74, 222, 128, 0.3);
    }
    h1 {
      posisi: tetap;
      atas: 20px;
      ukuranFont: 1.5rem;
    }
  </gaya>
</kepala>
<badan>
  <h1>🐍 Game Uular IndoCode</h1>
  <kanvas id="game" lebar="400" tinggi="400"></kanvas>
  <skrip src="game_ular.indo"></skrip>
</badan>
</html>
`,
      },
    ],
  },
  {
    id: 'landing-page',
    name: 'Landing Page Modern',
    description: 'Hero, features, CTA, responsive',
    icon: '🚀',
    category: 'web',
    files: [
      {
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Landing Page</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Hero -->
  <section class="hero">
    <nav class="nav">
      <div class="logo">🚀 ProductName</div>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#contact">Contact</a>
        <a href="#" class="btn-nav">Get Started</a>
      </div>
    </nav>
    <div class="hero-content">
      <h1>Build Something <span class="gradient">Amazing</span></h1>
      <p>The modern platform for developers. Ship faster, scale better, delight users.</p>
      <div class="hero-cta">
        <button class="btn btn-primary">Start Free Trial</button>
        <button class="btn btn-secondary">Watch Demo</button>
      </div>
      <div class="hero-stats">
        <div><strong>10K+</strong> Users</div>
        <div><strong>99.9%</strong> Uptime</div>
        <div><strong>24/7</strong> Support</div>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="features">
    <h2>Why Choose Us?</h2>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Lightning Fast</h3>
        <p>Optimized for speed. Your users will love the instant responses.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>Secure by Default</h3>
        <p>Enterprise-grade security built in. Your data is always protected.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📈</div>
        <h3>Scales Infinitely</h3>
        <p>From 10 users to 10 million, we handle the load seamlessly.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>Beautiful UI</h3>
        <p>Stunning designs that work flawlessly on any device.</p>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta">
    <h2>Ready to Get Started?</h2>
    <p>Join thousands of happy customers today.</p>
    <button class="btn btn-primary btn-large">Start Free Trial</button>
  </section>

  <footer class="footer">
    <p>&copy; 2025 ProductName. Built with ❤️</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>
`,
      },
      {
        name: 'style.css',
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --bg: #0f0f1e;
  --text: #1f2937;
  --text-light: #f3f4f6;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text-light);
  overflow-x: hidden;
}

/* Hero */
.hero {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 50%);
  animation: pulse 8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  position: relative;
  z-index: 10;
}

.logo { font-size: 1.5rem; font-weight: bold; }

.nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-links a {
  color: var(--text-light);
  text-decoration: none;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.nav-links a:hover { opacity: 1; }

.btn-nav {
  background: var(--primary);
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  opacity: 1 !important;
}

.hero-content {
  text-align: center;
  padding: 4rem 2rem;
  position: relative;
  z-index: 10;
}

.hero-content h1 {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  margin-bottom: 1rem;
  font-weight: 800;
}

.gradient {
  background: linear-gradient(135deg, #6366f1, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-content p {
  font-size: 1.25rem;
  opacity: 0.8;
  margin-bottom: 2rem;
}

.hero-cta {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 3rem;
}

.btn {
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
}

.btn-large {
  padding: 1.25rem 3rem;
  font-size: 1.125rem;
}

.hero-stats {
  display: flex;
  gap: 3rem;
  justify-content: center;
}

.hero-stats div { text-align: center; }
.hero-stats strong {
  display: block;
  font-size: 2rem;
  font-weight: 800;
}

/* Features */
.features {
  padding: 6rem 2rem;
  background: white;
  color: var(--text);
}

.features h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  text-align: center;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border-color: var(--primary);
}

.feature-icon { font-size: 3rem; margin-bottom: 1rem; }
.feature-card h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }
.feature-card p { color: #6b7280; }

/* CTA */
.cta {
  padding: 6rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
}

.cta h2 { font-size: 2.5rem; margin-bottom: 1rem; }
.cta p { font-size: 1.25rem; opacity: 0.9; margin-bottom: 2rem; }

/* Footer */
.footer {
  padding: 2rem;
  text-align: center;
  background: #0f0f1e;
  opacity: 0.7;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links { gap: 1rem; }
  .nav-links a:not(.btn-nav) { display: none; }
  .hero-stats { gap: 1.5rem; }
  .hero-stats strong { font-size: 1.5rem; }
}
`,
      },
      {
        name: 'script.js',
        content: `// Landing Page — Smooth scroll & button interactions
(function() {
  'use strict';

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // CTA buttons
  document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', () => {
      // In production: redirect to signup
      console.log('CTA clicked:', btn.textContent);
    });
  });

  // Feature card animation on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.6s ease';
    observer.observe(card);
  });

  console.log('Landing page loaded');
})();
`,
      },
    ],
  },
]

export const PROJECT_TEMPLATE_CATEGORIES: Record<string, { label: string; icon: string }> = {
  web: { label: 'Web', icon: '🌐' },
  game: { label: 'Game', icon: '🎮' },
  app: { label: 'App', icon: '📱' },
  indo: { label: 'IndoCode', icon: '🇮🇩' },
  utility: { label: 'Utility', icon: '🛠️' },
}
