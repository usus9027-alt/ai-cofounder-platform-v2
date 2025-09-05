require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Environment check:', {
  url: !!supabaseUrl,
  serviceKey: !!supabaseServiceKey,
  urlValue: supabaseUrl
})

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  console.log('Setting up database schema...')

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID REFERENCES auth.users(id) PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `

  const createCanvasObjectsTable = `
    CREATE TABLE IF NOT EXISTS canvas_objects (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      object_data JSONB NOT NULL,
      object_type TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `

  const createProjectsTable = `
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `

  const enableRLS = `
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE canvas_objects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  `

  const createPolicies = `
    -- Users policies
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can insert own profile" ON users;
    CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

    -- Messages policies
    DROP POLICY IF EXISTS "Users can view own messages" ON messages;
    CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
    CREATE POLICY "Users can insert own messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

    -- Canvas objects policies
    DROP POLICY IF EXISTS "Users can view own canvas objects" ON canvas_objects;
    CREATE POLICY "Users can view own canvas objects" ON canvas_objects FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can insert own canvas objects" ON canvas_objects;
    CREATE POLICY "Users can insert own canvas objects" ON canvas_objects FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can update own canvas objects" ON canvas_objects;
    CREATE POLICY "Users can update own canvas objects" ON canvas_objects FOR UPDATE USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can delete own canvas objects" ON canvas_objects;
    CREATE POLICY "Users can delete own canvas objects" ON canvas_objects FOR DELETE USING (auth.uid() = user_id);

    -- Projects policies
    DROP POLICY IF EXISTS "Users can view own projects" ON projects;
    CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
    CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can update own projects" ON projects;
    CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
    CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);
  `

  try {
    console.log('Creating tables...')
    await supabase.rpc('exec_sql', { sql: createUsersTable })
    await supabase.rpc('exec_sql', { sql: createMessagesTable })
    await supabase.rpc('exec_sql', { sql: createCanvasObjectsTable })
    await supabase.rpc('exec_sql', { sql: createProjectsTable })
    
    console.log('Enabling RLS...')
    await supabase.rpc('exec_sql', { sql: enableRLS })
    
    console.log('Creating policies...')
    await supabase.rpc('exec_sql', { sql: createPolicies })
    
    console.log('Database setup completed successfully!')
  } catch (error) {
    console.error('Error setting up database:', error)
  }
}

setupDatabase()
