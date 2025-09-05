const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('Environment check:')
  console.log('- URL:', !!supabaseUrl)
  console.log('- Service Key:', !!supabaseServiceKey)

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('\n=== Checking canvas_objects table ===')
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'canvas_objects')
      .eq('table_schema', 'public')

    if (columnsError) {
      console.log('Error getting columns:', columnsError)
    } else if (columns && columns.length > 0) {
      console.log('Canvas objects table columns:')
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    } else {
      console.log('No columns found - table may not exist')
    }

    const { data: testData, error: testError } = await supabase
      .from('canvas_objects')
      .select('*')
      .limit(1)

    if (testError) {
      console.log('Test query error:', testError)
    } else {
      console.log('Test query successful, rows:', testData?.length || 0)
    }

    console.log('\n=== All tables in public schema ===')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (tablesError) {
      console.log('Error getting tables:', tablesError)
    } else {
      console.log('Available tables:', tables?.map(t => t.table_name).join(', '))
    }

  } catch (error) {
    console.error('Schema check error:', error)
  }
}

checkSchema()
