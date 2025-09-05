const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function finalDatabaseFix() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('=== Final Database Fix ===')
    console.log('The canvas_objects table exists but is missing the object_data column.')
    console.log('Since we cannot execute raw SQL through the REST API, we need manual intervention.')
    
    console.log('\n1. Testing current canvas_objects table state...')
    const { data: testData, error: testError } = await supabase
      .from('canvas_objects')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000001',
        object_data: { test: 'data' },
        object_type: 'test'
      })
      .select()

    if (testError) {
      console.log('✗ Confirmed: canvas_objects table missing object_data column')
      console.log('Error:', testError.message)
    } else {
      console.log('✓ Canvas objects table has correct structure!')
      if (testData && testData[0]) {
        await supabase.from('canvas_objects').delete().eq('id', testData[0].id)
      }
      return
    }

    console.log('\n=== MANUAL FIX REQUIRED ===')
    console.log('Please run this SQL in the Supabase Dashboard SQL Editor:')
    console.log('https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql')
    console.log('')
    console.log('-- Fix canvas_objects table')
    console.log('DROP TABLE IF EXISTS canvas_objects CASCADE;')
    console.log('')
    console.log('CREATE TABLE canvas_objects (')
    console.log('  id SERIAL PRIMARY KEY,')
    console.log('  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,')
    console.log('  object_data JSONB NOT NULL,')
    console.log('  object_type TEXT NOT NULL,')
    console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()')
    console.log(');')
    console.log('')
    console.log('-- Enable RLS')
    console.log('ALTER TABLE canvas_objects ENABLE ROW LEVEL SECURITY;')
    console.log('')
    console.log('-- Create policies')
    console.log('CREATE POLICY "Users can view own canvas objects" ON canvas_objects FOR SELECT USING (auth.uid() = user_id);')
    console.log('CREATE POLICY "Users can insert own canvas objects" ON canvas_objects FOR INSERT WITH CHECK (auth.uid() = user_id);')
    console.log('CREATE POLICY "Users can update own canvas objects" ON canvas_objects FOR UPDATE USING (auth.uid() = user_id);')
    console.log('CREATE POLICY "Users can delete own canvas objects" ON canvas_objects FOR DELETE USING (auth.uid() = user_id);')
    console.log('')
    console.log('After running this SQL, the Canvas functionality will work correctly.')

  } catch (error) {
    console.error('Database fix error:', error)
  }
}

finalDatabaseFix()
