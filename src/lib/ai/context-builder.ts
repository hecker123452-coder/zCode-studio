/**
 * Project Context Builder
 *
 * Builds rich context for the AI agent:
 * - File tree (hierarchical view)
 * - Active file with full content
 * - Related files (dependencies, siblings)
 * - Project stats
 *
 * This replaces the old "first 5 files truncated to 500 chars" approach
 * with smart context selection.
 */

import type { ProjectContext } from './prompts'

interface FileNodeLite {
  id: string
  name: string
  type: 'file' | 'folder'
  parentId: string | null
  content?: string
  language?: string
  children?: string[]
  expanded?: boolean
}

/**
 * Build hierarchical file tree string (like `tree` command output)
 */
export function buildFileTree(files: Record<string, FileNodeLite>, rootIds: string[]): string {
  if (rootIds.length === 0) return '(empty project)'

  const lines: string[] = ['.']

  const render = (fileIds: string[], prefix: string, depth: number) => {
    if (depth > 4) return // limit depth for very nested projects

    // Sort: folders first, then files alphabetically
    const sorted = [...fileIds].sort((a, b) => {
      const fa = files[a]
      const fb = files[b]
      if (!fa || !fb) return 0
      if (fa.type !== fb.type) return fa.type === 'folder' ? -1 : 1
      return fa.name.localeCompare(fb.name)
    })

    sorted.forEach((id, idx) => {
      const file = files[id]
      if (!file) return

      const isLast = idx === sorted.length - 1
      const connector = isLast ? '└── ' : '├── '
      const icon = file.type === 'folder' ? '📁' : '📄'
      lines.push(`${prefix}${connector}${icon} ${file.name}`)

      if (file.type === 'folder' && file.children && file.children.length > 0) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ')
        render(file.children, newPrefix, depth + 1)
      }
    })
  }

  render(rootIds, '', 0)
  return lines.join('\n')
}

/**
 * Detect file relationships based on imports/references
 */
function detectRelations(activeFile: FileNodeLite, allFiles: FileNodeLite[]): Array<{ file: FileNodeLite; relation: string }> {
  const relations: Array<{ file: FileNodeLite; relation: string }> = []
  const content = activeFile.content || ''

  // Detect <link rel="stylesheet" href="...">
  const cssLinks = content.match(/<link[^>]*href=["']([^"']+\.css)["']/gi) || []
  for (const link of cssLinks) {
    const match = link.match(/href=["']([^"']+\.css)["']/i)
    if (match) {
      const fileName = match[1].split('/').pop() || match[1]
      const found = allFiles.find(f => f.name === fileName && f.type === 'file')
      if (found) relations.push({ file: found, relation: 'CSS dependency' })
    }
  }

  // Detect <script src="...">
  const scriptSrcs = content.match(/<script[^>]*src=["']([^"']+\.js)["']/gi) || []
  for (const src of scriptSrcs) {
    const match = src.match(/src=["']([^"']+\.js)["']/i)
    if (match) {
      const fileName = match[1].split('/').pop() || match[1]
      const found = allFiles.find(f => f.name === fileName && f.type === 'file')
      if (found) relations.push({ file: found, relation: 'JS dependency' })
    }
  }

  // Detect JS imports: import X from './file' or require('./file')
  const importMatches = content.match(/(?:import|require)\s*\(?\s*['"]\.\/([^'"]+)['"]/g) || []
  for (const imp of importMatches) {
    const match = imp.match(/['"]\.\/([^'"]+)['"]/)
    if (match) {
      const fileName = match[1].split('/').pop() || match[1]
      const found = allFiles.find(f =>
        f.name === fileName ||
        f.name === `${fileName}.js` ||
        f.name === `${fileName}.ts` ||
        f.name === `${fileName}.jsx` ||
        f.name === `${fileName}.tsx`
      )
      if (found) relations.push({ file: found, relation: 'Import' })
    }
  }

  // Detect sibling files (same parent folder, same language family)
  const activeExt = activeFile.name.split('.').pop()?.toLowerCase()
  if (activeExt) {
    for (const f of allFiles) {
      if (f.id === activeFile.id) continue
      if (f.parentId !== activeFile.parentId) continue
      const fExt = f.name.split('.').pop()?.toLowerCase()
      if (fExt === activeExt) {
        relations.push({ file: f, relation: 'Sibling' })
      }
    }
  }

  return relations
}

/**
 * Build full project context for AI
 */
export function buildProjectContext(opts: {
  files: Record<string, FileNodeLite>
  rootIds: string[]
  activeFileId?: string
  maxRelatedFiles?: number
  maxFileContentChars?: number
}): ProjectContext {
  const { files, rootIds, activeFileId, maxRelatedFiles = 3, maxFileContentChars = 4000 } = opts

  const fileTree = buildFileTree(files, rootIds)

  // Stats
  const allFiles = Object.values(files).filter(f => f.type === 'file')
  const totalLines = allFiles.reduce((sum, f) => sum + (f.content?.split('\n').length || 0), 0)
  const languages = [...new Set(allFiles.map(f => f.language).filter(Boolean))] as string[]

  let activeFile: ProjectContext['activeFile']
  let relatedFiles: ProjectContext['relatedFiles'] = []

  if (activeFileId && files[activeFileId]) {
    const af = files[activeFileId]
    const allFileNodes = Object.values(files)
    const path = buildPath(files, activeFileId)

    activeFile = {
      name: af.name,
      language: af.language || 'plaintext',
      content: (af.content || '').slice(0, maxFileContentChars),
      path,
    }

    // Detect related files
    const detected = detectRelations(af, allFileNodes)
    // Dedupe & limit
    const seen = new Set<string>()
    for (const r of detected) {
      if (seen.has(r.file.id)) continue
      if (relatedFiles.length >= maxRelatedFiles) break
      seen.add(r.file.id)
      relatedFiles.push({
        name: r.file.name,
        language: r.file.language || 'plaintext',
        content: (r.file.content || '').slice(0, 1500),
        relation: r.relation,
      })
    }
  }

  return {
    fileTree,
    activeFile,
    relatedFiles,
    stats: {
      totalFiles: allFiles.length,
      totalLines,
      languages,
    },
  }
}

/**
 * Build file path from root (e.g., "src/components/Button.tsx")
 */
function buildPath(files: Record<string, FileNodeLite>, fileId: string): string {
  const parts: string[] = []
  let currentId: string | null = fileId

  while (currentId && files[currentId]) {
    const file = files[currentId]
    parts.unshift(file.name)
    currentId = file.parentId
  }

  return parts.join('/')
}
