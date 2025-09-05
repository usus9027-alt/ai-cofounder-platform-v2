import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    return null
  }

  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey
    })
    return null
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    }
  })

  return supabaseInstance
}

export const supabase = getSupabaseClient()

let supabaseAdminInstance: SupabaseClient | null = null

export function getSupabaseAdmin() {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('Supabase admin initialization:', {
    url: !!supabaseUrl,
    serviceKey: !!supabaseServiceKey,
    urlValue: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'undefined',
    serviceKeyValue: supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'undefined'
  })

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase admin environment variables:', {
      url: !!supabaseUrl,
      serviceKey: !!supabaseServiceKey
    })
    return null
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })

  return supabaseAdminInstance
}

export const supabaseAdmin = getSupabaseAdmin()

export default supabase
