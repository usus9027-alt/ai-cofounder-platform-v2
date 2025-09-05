const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function fixSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('=== Checking current canvas_objects table structure ===')
    
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'canvas_objects' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      })

    if (tableError) {
      console.log('Table structure query error:', tableError)
      
      const { data: describeData, error: describeError } = await supabase
        .rpc('exec_sql', { sql: 'DESCRIBE canvas_objects;' })
      
      if (describeError) {
        console.log('Describe table error:', describeError)
        
        console.log('Attempting to determine table structure by testing insert...')
        const { data: insertTest, error: insertError } = await supabase
          .from('canvas_objects')
          .insert({
            user_id: 'test-user-id',
            object_data: { test: 'data' },
            object_type: 'test'
          })
          .select()
        
        if (insertError) {
          console.log('Insert test error (this tells us about column structure):', insertError)
        } else {
          console.log('Insert test successful:', insertTest)
        }
      } else {
        console.log('Table description:', describeData)
      }
    } else {
      console.log('Current table structure:', tableInfo)
    }

    console.log('\n=== Attempting to add missing object_data column ===')
    const { data: alterResult, error: alterError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          ALTER TABLE canvas_objects 
          ADD COLUMN IF NOT EXISTS object_data JSONB NOT NULL DEFAULT '{}';
        `
      })

    if (alterError) {
      console.log('Alter table error:', alterError)
    } else {
      console.log('Successfully added object_data column (or it already existed)')
    }

    console.log('\n=== Testing canvas object creation after fix ===')
    const testObject = {
      user_id: 'test-user-' + Date.now(),
      object_data: { width: 100, height: 60, x: 50, y: 50, fill: '#3b82f6' },
      object_type: 'rect'
    }

    const { data: createResult, error: createError } = await supabase
      .from('canvas_objects')
      .insert(testObject)
      .select()

    if (createError) {
      console.log('Test creation error:', createError)
    } else {
      console.log('Test creation successful:', createResult)
      
      if (createResult && createResult[0]) {
        await supabase
          .from('canvas_objects')
          .delete()
          .eq('id', createResult[0].id)
        console.log('Cleaned up test data')
      }
    }

  } catch (error) {
    console.error('Schema fix error:', error)
  }
}

fixSchema()
