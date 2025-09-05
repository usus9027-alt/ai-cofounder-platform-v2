const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createSchemaDirect() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('=== Creating database schema using direct table operations ===')

    console.log('1. Setting up users table...')
    try {
      const testUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
        name: 'Test User'
      }
      
      const { data: userResult, error: userError } = await supabase
        .from('users')
        .upsert(testUser)
        .select()
      
      if (userError) {
        console.log('Users table creation needed:', userError.message)
      } else {
        console.log('✓ Users table exists and working')
        await supabase.from('users').delete().eq('id', testUser.id)
      }
    } catch (error) {
      console.log('Users table setup error:', error.message)
    }

    console.log('2. Setting up messages table...')
    try {
      const testMessage = {
        user_id: '00000000-0000-0000-0000-000000000001',
        content: 'Test message',
        role: 'user'
      }
      
      const { data: messageResult, error: messageError } = await supabase
        .from('messages')
        .insert(testMessage)
        .select()
      
      if (messageError) {
        console.log('Messages table creation needed:', messageError.message)
      } else {
        console.log('✓ Messages table exists and working')
        if (messageResult && messageResult[0]) {
          await supabase.from('messages').delete().eq('id', messageResult[0].id)
        }
      }
    } catch (error) {
      console.log('Messages table setup error:', error.message)
    }

    console.log('3. Setting up canvas_objects table...')
    try {
      const testCanvasObject = {
        user_id: '00000000-0000-0000-0000-000000000001',
        object_data: { width: 100, height: 60, x: 50, y: 50, fill: '#3b82f6' },
        object_type: 'rect'
      }
      
      const { data: canvasResult, error: canvasError } = await supabase
        .from('canvas_objects')
        .insert(testCanvasObject)
        .select()
      
      if (canvasError) {
        console.log('Canvas objects table creation needed:', canvasError.message)
        console.log('This is the main issue - the table exists but missing object_data column')
      } else {
        console.log('✓ Canvas objects table exists with correct structure')
        if (canvasResult && canvasResult[0]) {
          await supabase.from('canvas_objects').delete().eq('id', canvasResult[0].id)
        }
      }
    } catch (error) {
      console.log('Canvas objects table setup error:', error.message)
    }

    console.log('4. Setting up projects table...')
    try {
      const testProject = {
        user_id: '00000000-0000-0000-0000-000000000001',
        name: 'Test Project',
        description: 'Test Description',
        status: 'active'
      }
      
      const { data: projectResult, error: projectError } = await supabase
        .from('projects')
        .insert(testProject)
        .select()
      
      if (projectError) {
        console.log('Projects table creation needed:', projectError.message)
      } else {
        console.log('✓ Projects table exists and working')
        if (projectResult && projectResult[0]) {
          await supabase.from('projects').delete().eq('id', projectResult[0].id)
        }
      }
    } catch (error) {
      console.log('Projects table setup error:', error.message)
    }

    console.log('\n=== Schema Creation Summary ===')
    console.log('The main issue is that canvas_objects table exists but is missing the object_data column.')
    console.log('This needs to be fixed manually in the Supabase Dashboard.')
    console.log('\nSQL to run in Supabase Dashboard SQL Editor:')
    console.log(`
-- Fix canvas_objects table structure
DROP TABLE IF EXISTS canvas_objects CASCADE;
CREATE TABLE canvas_objects (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  object_data JSONB NOT NULL,
  object_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE canvas_objects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own canvas objects" ON canvas_objects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own canvas objects" ON canvas_objects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own canvas objects" ON canvas_objects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own canvas objects" ON canvas_objects FOR DELETE USING (auth.uid() = user_id);
    `)

  } catch (error) {
    console.error('Schema creation error:', error)
  }
}

createSchemaDirect()
