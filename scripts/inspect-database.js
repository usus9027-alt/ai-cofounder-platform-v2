const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function inspectDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('Inspecting canvas_objects table structure...')
    
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'canvas_objects' })
      .catch(async () => {
        const { data, error } = await supabase
          .from('canvas_objects')
          .select('*')
          .limit(1)
        
        if (error) {
          console.log('Table query error:', error)
          return { data: null, error }
        }
        
        console.log('Sample row structure:', data)
        return { data, error: null }
      })

    if (columnsError) {
      console.log('Columns query error:', columnsError)
    } else {
      console.log('Table columns:', columns)
    }

    console.log('\nChecking all tables...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (tablesError) {
      console.log('Tables query error:', tablesError)
    } else {
      console.log('Available tables:', tables?.map(t => t.table_name))
    }

  } catch (error) {
    console.error('Database inspection error:', error)
  }
}

inspectDatabase()
