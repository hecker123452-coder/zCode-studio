// File templates for "New from Template" feature
// Each template is a starter boilerplate for common file types

export interface FileTemplate {
  id: string
  name: string
  filename: string
  description: string
  icon: string
  category: 'web' | 'mobile' | 'script' | 'doc' | 'config'
  content: string
}

export const FILE_TEMPLATES: FileTemplate[] = [
  {
    id: 'html5',
    name: 'HTML5 Boilerplate',
    filename: 'index.html',
    description: 'Standard HTML5 with meta tags',
    icon: '',
    category: 'web',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; padding: 2rem; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>Hello World </h1>
  <p>Welcome to my page.</p>
  <script>
    console.log('Page loaded');
  </script>
</body>
</html>
`,
  },
  {
    id: 'html-game',
    name: 'HTML Canvas Game',
    filename: 'game.html',
    description: 'Canvas game with game loop',
    icon: '',
    category: 'web',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Game</title>
  <style>
    body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
    canvas { background: #111; border: 2px solid #333; }
  </style>
</head>
<body>
  <canvas id="game" width="400" height="400"></canvas>
  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    let lastTime = 0;

    function update(dt) {
      // Game logic here
    }

    function draw() {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw stuff here
    }

    function loop(time) {
      const dt = time - lastTime;
      lastTime = time;
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  </script>
</body>
</html>
`,
  },
  {
    id: 'css',
    name: 'CSS Stylesheet',
    filename: 'styles.css',
    description: 'CSS with reset + variables',
    icon: '',
    category: 'web',
    content: `/* CSS Reset */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* CSS Variables */
:root {
  --primary: #6366f1;
  --bg: #ffffff;
  --text: #1f2937;
  --border: #e5e7eb;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover { opacity: 0.9; }
`,
  },
  {
    id: 'js',
    name: 'JavaScript Module',
    filename: 'main.js',
    description: 'JS with utility functions',
    icon: '',
    category: 'script',
    content: `// JavaScript Module
// Author: Your Name

/**
 * Utility functions
 */
export const utils = {
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  formatNumber(n) {
    return n.toLocaleString('id-ID');
  },
};

/**
 * Main entry point
 */
function main() {
  console.log('App started');
  console.log('Random number:', utils.random(1, 100));
}

main();
`,
  },
  {
    id: 'ts',
    name: 'TypeScript Module',
    filename: 'main.ts',
    description: 'TS with types & interfaces',
    icon: '',
    category: 'script',
    content: `// TypeScript Module

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

class UserService {
  private users: Map<number, User> = new Map();

  add(user: Omit<User, 'id' | 'createdAt'>): User {
    const id = this.users.size + 1;
    const newUser: User = { ...user, id, createdAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }

  get(id: number): User | undefined {
    return this.users.get(id);
  }

  list(): User[] {
    return Array.from(this.users.values());
  }
}

const service = new UserService();
service.add({ name: 'John', email: 'john@example.com' });
console.log(service.list());
`,
  },
  {
    id: 'py',
    name: 'Python Script',
    filename: 'main.py',
    description: 'Python with main guard',
    icon: '',
    category: 'script',
    content: `#!/usr/bin/env python3
"""Python script template."""

import sys
import argparse
from typing import List, Optional


def main(args: List[str]) -> int:
    parser = argparse.ArgumentParser(description='My Python Script')
    parser.add_argument('--name', default='World', help='Name to greet')
    opts = parser.parse_args(args)

    print(f'Hello, {opts.name}! ')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
`,
  },
  {
    id: 'react',
    name: 'React Component',
    filename: 'Component.tsx',
    description: 'React functional component',
    icon: '',
    category: 'web',
    content: `import { useState, useEffect } from 'react';

interface Props {
  title: string;
  initialCount?: number;
}

export function Component({ title, initialCount = 0 }: Props) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    console.log(\`Count: \${count}\`);
  }, [count]);

  return (
    <div className="component">
      <h2>{title}</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
`,
  },
  {
    id: 'md',
    name: 'Markdown Doc',
    filename: 'README.md',
    description: 'Markdown with sections',
    icon: '',
    category: 'doc',
    content: `# Project Title

Short description of what this project does.

## Features

-  Feature 1
-  Feature 2
-  Feature 3

## Installation

\`\`\`bash
npm install my-package
\`\`\`

## Usage

\`\`\`js
import { foo } from 'my-package';
foo();
\`\`\`

## API

### \`foo(options)\`

Does something cool.

| Param | Type | Description |
|-------|------|-------------|
| options | object | Options |

## License

MIT © Your Name
`,
  },
  {
    id: 'json',
    name: 'JSON Config',
    filename: 'config.json',
    description: 'JSON configuration',
    icon: '',
    category: 'config',
    content: `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "Project description",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "echo \\"no tests\\" && exit 0"
  },
  "keywords": [],
  "author": "",
  "license": "MIT"
}
`,
  },
  {
    id: 'indo',
    name: 'IndoCode Script',
    filename: 'program.indo',
    description: 'IndoCode bahasa Indonesia',
    icon: '',
    category: 'script',
    content: `// Program IndoCode
variabel nama = "Dunia"

fungsi sapa(nama) {
    tampilkan("Halo, " + nama + "! ")
}

untuk (variabel i = 0; i < 3; i++) {
    sapa(nome + " ke-" + (i + 1))
}

tampilkan("Selesai!")
`,
  },
]

export const TEMPLATE_CATEGORIES: Record<string, { label: string; icon: string }> = {
  web: { label: 'Web', icon: '' },
  mobile: { label: 'Mobile', icon: '' },
  script: { label: 'Script', icon: '' },
  doc: { label: 'Docs', icon: '' },
  config: { label: 'Config', icon: '' },
}
