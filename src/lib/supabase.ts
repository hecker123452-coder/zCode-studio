/**
 * Supabase client for ZCode Studio.
 *
 * Used for:
 * - Cloud project sync (save/load projects across devices)
 * - Cross-device file sharing
 *
 * Uses the publishable (anon) key — safe for client-side use.
 * RLS policies must be configured in Supabase dashboard.
 *
 * SQL to run in Supabase SQL Editor:
 *
 * CREATE TABLE IF NOT EXISTS projects (
 *   id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 *   name TEXT NOT NULL,
 *   data JSONB NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   user_token TEXT  -- simple device identifier (no auth)
 * );
 *
 * ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow all for now" ON projects FOR ALL USING (true) WITH CHECK (true);
 *
 * CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wgthyvsxykbdsgjnolwv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qfZhA8zZMZcQf98BK2gUmw_2aIP6QYp'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // no auth — we use device token
  },
})

export interface CloudProject {
  id: string
  name: string
  data: {
    files: Array<{
      name: string
      type: 'file' | 'folder'
      content?: string
      language?: string
      parentId?: string | null
    }>
  }
  created_at: string
  updated_at: string
  user_token: string
}

// Generate or load device token (simple identifier, not real auth)
const DEVICE_TOKEN_KEY = 'zcode-device-token'

export function getDeviceToken(): string {
  if (typeof window === 'undefined') return 'server'
  let token = localStorage.getItem(DEVICE_TOKEN_KEY)
  if (!token) {
    token = 'dev-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
    localStorage.setItem(DEVICE_TOKEN_KEY, token)
  }
  return token
}

export async function uploadProjectToCloud(name: string, files: CloudProject['data']['files']): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        data: { files },
        user_token: getDeviceToken(),
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    return { id: data.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateCloudProject(id: string, name: string, files: CloudProject['data']['files']): Promise<{ success: boolean } | { error: string }> {
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        name,
        data: { files },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_token', getDeviceToken())

    if (error) return { error: error.message }
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function listCloudProjects(): Promise<{ projects: CloudProject[] } | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, created_at, updated_at, user_token')
      .eq('user_token', getDeviceToken())
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) return { error: error.message }
    return { projects: data || [] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function loadCloudProject(id: string): Promise<{ project: CloudProject } | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_token', getDeviceToken())
      .single()

    if (error) return { error: error.message }
    return { project: data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function deleteCloudProject(id: string): Promise<{ success: boolean } | { error: string }> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_token', getDeviceToken())

    if (error) return { error: error.message }
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
