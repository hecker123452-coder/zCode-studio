import type { editor } from 'monaco-editor'
import type { ThemeName } from '@/store/editor-store'

export interface ThemeInfo {
  name: ThemeName
  label: string
  ui: 'dark' | 'light'
  description: string
}

export const THEMES: ThemeInfo[] = [
  { name: 'vs-dark', label: 'Dark+ (default)', ui: 'dark', description: 'VS Code default dark theme' },
  { name: 'light', label: 'Light+ (default)', ui: 'light', description: 'VS Code default light theme' },
  { name: 'hc-black', label: 'High Contrast Black', ui: 'dark', description: 'High contrast dark theme' },
  { name: 'monokai', label: 'Monokai', ui: 'dark', description: 'Classic Monokai theme' },
  { name: 'dracula', label: 'Dracula', ui: 'dark', description: 'Dark vampire theme' },
  { name: 'github', label: 'GitHub', ui: 'light', description: 'GitHub light theme' },
  { name: 'solarized-dark', label: 'Solarized Dark', ui: 'dark', description: 'Solarized dark variant' },
  { name: 'solarized-light', label: 'Solarized Light', ui: 'light', description: 'Solarized light variant' },
  { name: 'one-dark-pro', label: 'One Dark Pro', ui: 'dark', description: 'Atom One Dark Pro' },
  { name: 'nord', label: 'Nord', ui: 'dark', description: 'Nord arctic theme' },
]

export const defineMonacoThemes = (monaco: typeof import('monaco-editor')) => {
  // Monokai
  monaco.editor.defineTheme('monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f92672' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'function', foreground: 'a6e22e' },
      { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
      { token: 'constant', foreground: 'ae81ff' },
      { token: 'operator', foreground: 'f92672' },
      { token: 'delimiter', foreground: 'f8f8f2' },
      { token: 'identifier', foreground: 'f8f8f2' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#90908a',
      'editorLineNumber.activeForeground': '#c8c8c2',
      'editorCursor.foreground': '#f8f8f0',
      'editor.selectionBackground': '#49483e',
      'editor.lineHighlightBackground': '#3e3d32',
      'editorIndentGuide.background': '#3b3a32',
      'editorIndentGuide.activeBackground': '#75715e',
    },
  })

  // Dracula
  monaco.editor.defineTheme('dracula', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'type', foreground: '8be9fd', fontStyle: 'italic' },
      { token: 'constant', foreground: 'bd93f9' },
      { token: 'operator', foreground: 'ff79c6' },
      { token: 'delimiter', foreground: 'f8f8f2' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#6272a4',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editorCursor.foreground': '#f8f8f0',
      'editor.selectionBackground': '#44475a',
      'editor.lineHighlightBackground': '#44475a',
      'editorIndentGuide.background': '#44475a',
      'editorIndentGuide.activeBackground': '#bd93f9',
    },
  })

  // GitHub (light)
  monaco.editor.defineTheme('github', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'd73a49' },
      { token: 'string', foreground: '032f62' },
      { token: 'number', foreground: '005cc5' },
      { token: 'function', foreground: '6f42c1' },
      { token: 'type', foreground: '22863a' },
      { token: 'constant', foreground: '005cc5' },
      { token: 'operator', foreground: 'd73a49' },
      { token: 'delimiter', foreground: '24292e' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292e',
      'editorLineNumber.foreground': '#959da5',
      'editorLineNumber.activeForeground': '#24292e',
      'editorCursor.foreground': '#24292e',
      'editor.selectionBackground': '#0366d625',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editorIndentGuide.background': '#e1e4e8',
      'editorIndentGuide.activeBackground': '#959da5',
    },
  })

  // Solarized Dark
  monaco.editor.defineTheme('solarized-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string', foreground: '2aa198' },
      { token: 'number', foreground: 'd33682' },
      { token: 'function', foreground: '268bd2' },
      { token: 'type', foreground: 'b58900', fontStyle: 'italic' },
      { token: 'constant', foreground: 'd33682' },
      { token: 'operator', foreground: '859900' },
      { token: 'delimiter', foreground: '93a1a1' },
    ],
    colors: {
      'editor.background': '#002b36',
      'editor.foreground': '#93a1a1',
      'editorLineNumber.foreground': '#586e75',
      'editorLineNumber.activeForeground': '#93a1a1',
      'editorCursor.foreground': '#839496',
      'editor.selectionBackground': '#073642',
      'editor.lineHighlightBackground': '#073642',
      'editorIndentGuide.background': '#586e7544',
      'editorIndentGuide.activeBackground': '#586e75',
    },
  })

  // Solarized Light
  monaco.editor.defineTheme('solarized-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '93a1a1', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string', foreground: '2aa198' },
      { token: 'number', foreground: 'd33682' },
      { token: 'function', foreground: '268bd2' },
      { token: 'type', foreground: 'b58900', fontStyle: 'italic' },
      { token: 'constant', foreground: 'd33682' },
      { token: 'operator', foreground: '859900' },
      { token: 'delimiter', foreground: '586e75' },
    ],
    colors: {
      'editor.background': '#fdf6e3',
      'editor.foreground': '#586e75',
      'editorLineNumber.foreground': '#93a1a1',
      'editorLineNumber.activeForeground': '#586e75',
      'editorCursor.foreground': '#657b83',
      'editor.selectionBackground': '#eee8d5',
      'editor.lineHighlightBackground': '#eee8d5',
      'editorIndentGuide.background': '#93a1a144',
      'editorIndentGuide.activeBackground': '#93a1a1',
    },
  })

  // One Dark Pro
  monaco.editor.defineTheme('one-dark-pro', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'function', foreground: '61afef' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'constant', foreground: 'd19a66' },
      { token: 'operator', foreground: '56b6c2' },
      { token: 'delimiter', foreground: 'abb2bf' },
      { token: 'identifier', foreground: 'e06c75' },
    ],
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editorLineNumber.foreground': '#495162',
      'editorLineNumber.activeForeground': '#abb2bf',
      'editorCursor.foreground': '#528bff',
      'editor.selectionBackground': '#3e4451',
      'editor.lineHighlightBackground': '#2c313c',
      'editorIndentGuide.background': '#3b4048',
      'editorIndentGuide.activeBackground': '#5c6370',
    },
  })

  // Nord
  monaco.editor.defineTheme('nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'number', foreground: 'b48ead' },
      { token: 'function', foreground: '88c0d0' },
      { token: 'type', foreground: '8fbcbb', fontStyle: 'italic' },
      { token: 'constant', foreground: 'd8dee9' },
      { token: 'operator', foreground: '81a1c1' },
      { token: 'delimiter', foreground: 'eceff4' },
    ],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#d8dee9',
      'editorLineNumber.foreground': '#4c566a',
      'editorLineNumber.activeForeground': '#d8dee9',
      'editorCursor.foreground': '#d8dee9',
      'editor.selectionBackground': '#434c5e',
      'editor.lineHighlightBackground': '#3b4252',
      'editorIndentGuide.background': '#434c5e',
      'editorIndentGuide.activeBackground': '#616e88',
    },
  })
}

export const getMonacoOptions = (
  settings: import('@/store/editor-store').EditorSettings,
  isMobile = false
): editor.IStandaloneEditorConstructionOptions => ({
  fontSize: isMobile ? Math.max(14, settings.fontSize) : settings.fontSize,
  wordWrap: settings.wordWrap,
  tabSize: settings.tabSize,
  minimap: { enabled: isMobile ? false : settings.minimap },
  lineNumbers: settings.lineNumbers,
  fontLigatures: settings.fontLigatures,
  cursorBlinking: settings.cursorBlinking,
  cursorSmoothCaretAnimation: settings.cursorSmoothCaretAnimation ? 'on' : 'off',
  renderWhitespace: settings.renderWhitespace,
  'bracketPairColorization': { enabled: settings.bracketPairColorization },
  smoothScrolling: settings.smoothScrolling,
  fontFamily: settings.fontFamily,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  padding: isMobile ? { top: 8, bottom: 80 } : { top: 12, bottom: 12 },
  renderLineHighlight: 'all',
  roundedSelection: true,
  guides: {
    bracketPairs: settings.bracketPairColorization,
    indentation: true,
  },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  quickSuggestions: { other: true, comments: false, strings: true },
  snippetSuggestions: 'inline',
  formatOnPaste: true,
  formatOnType: true,
  linkedEditing: true,
  multiCursorModifier: 'ctrlCmd',
  stickyScroll: { enabled: !isMobile },
  scrollbar: {
    verticalScrollbarSize: isMobile ? 6 : 10,
    horizontalScrollbarSize: isMobile ? 6 : 10,
    useShadows: false,
    alwaysConsumeMouseWheel: false,
  },
  overviewRulerBorder: false,
  lineDecorationsWidth: isMobile ? 4 : 6,
  lineNumbersMinChars: isMobile ? 2 : 3,
  mouseWheelScrollSensitivity: isMobile ? 2 : 1,
  fastScrollSensitivity: 5,
  cursorStyle: isMobile ? 'line-thin' : 'line',
  readOnly: false,
  domReadOnly: false,
  stickyTabStops: true,
  renderControlCharacters: false,
  largeFileOptimizations: true,
  linkedEditingEnabled: true,
  occurrencesHighlight: 'off',
  selectionHighlight: !isMobile,
  wordBasedSuggestions: 'off',
})
