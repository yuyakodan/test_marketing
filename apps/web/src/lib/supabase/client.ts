import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // 開発環境でSupabase未設定の場合、ダミーURLを使用
    // 実際のAPI呼び出しは失敗するが、ビルドは通る
    console.warn('Supabase credentials not configured. Using placeholder values.')
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  if (!supabaseClient) {
    supabaseClient = createBrowserClient(url, key)
  }

  return supabaseClient
}
