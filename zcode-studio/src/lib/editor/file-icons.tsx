import {
  FileText, FileCode, FileJson, FileTerminal, FileImage,
  FileArchive, FileType, FileCog, Braces, Hash, Coffee, Box,
  type LucideIcon,
} from 'lucide-react'

export interface FileIconInfo {
  icon: LucideIcon
  color: string
}

export const getFileIcon = (filename: string): FileIconInfo => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const lower = filename.toLowerCase()

  if (lower === 'dockerfile') return { icon: Box, color: '#2496ED' }
  if (lower === 'readme.md') return { icon: FileText, color: '#6B7280' }
  if (lower === 'package.json') return { icon: FileJson, color: '#CB3837' }
  if (lower === '.gitignore') return { icon: FileCog, color: '#F05032' }

  const map: Record<string, FileIconInfo> = {
    js: { icon: FileCode, color: '#F7DF1E' },
    jsx: { icon: FileCode, color: '#61DAFB' },
    mjs: { icon: FileCode, color: '#F7DF1E' },
    cjs: { icon: FileCode, color: '#F7DF1E' },
    ts: { icon: FileCode, color: '#3178C6' },
    tsx: { icon: FileCode, color: '#3178C6' },
    py: { icon: FileTerminal, color: '#3776AB' },
    rb: { icon: FileCode, color: '#CC342D' },
    php: { icon: FileCode, color: '#777BB4' },
    go: { icon: FileCode, color: '#00ADD8' },
    rs: { icon: FileCode, color: '#DEA584' },
    java: { icon: Coffee, color: '#ED8B00' },
    kt: { icon: FileCode, color: '#7F52FF' },
    swift: { icon: FileCode, color: '#FA7343' },
    c: { icon: FileCode, color: '#A8B9CC' },
    h: { icon: FileCode, color: '#A8B9CC' },
    cpp: { icon: FileCode, color: '#00599C' },
    cc: { icon: FileCode, color: '#00599C' },
    hpp: { icon: FileCode, color: '#00599C' },
    cs: { icon: FileCode, color: '#239120' },
    html: { icon: FileCode, color: '#E34F26' },
    htm: { icon: FileCode, color: '#E34F26' },
    css: { icon: Hash, color: '#1572B6' },
    scss: { icon: Hash, color: '#CC6699' },
    sass: { icon: Hash, color: '#CC6699' },
    less: { icon: Hash, color: '#1D365D' },
    json: { icon: Braces, color: '#F7DF1E' },
    xml: { icon: FileCode, color: '#0060AC' },
    md: { icon: FileText, color: '#6B7280' },
    markdown: { icon: FileText, color: '#6B7280' },
    yml: { icon: FileCog, color: '#CB171E' },
    yaml: { icon: FileCog, color: '#CB171E' },
    sh: { icon: FileTerminal, color: '#4EAA25' },
    bash: { icon: FileTerminal, color: '#4EAA25' },
    zsh: { icon: FileTerminal, color: '#4EAA25' },
    sql: { icon: FileArchive, color: '#E48E00' },
    graphql: { icon: FileCode, color: '#E10098' },
    gql: { icon: FileCode, color: '#E10098' },
    vue: { icon: FileCode, color: '#42B883' },
    svelte: { icon: FileCode, color: '#FF3E00' },
    txt: { icon: FileText, color: '#9CA3AF' },
    env: { icon: FileCog, color: '#ECD53F' },
    png: { icon: FileImage, color: '#9333EA' },
    jpg: { icon: FileImage, color: '#9333EA' },
    jpeg: { icon: FileImage, color: '#9333EA' },
    gif: { icon: FileImage, color: '#9333EA' },
    svg: { icon: FileImage, color: '#FFB13B' },
    webp: { icon: FileImage, color: '#9333EA' },
  }

  return map[ext] || { icon: FileType, color: '#9CA3AF' }
}
