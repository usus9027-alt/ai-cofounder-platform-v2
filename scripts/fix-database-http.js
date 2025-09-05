const https = require('https')
require('dotenv').config({ path: '.env.local' })

async function fixDatabaseHTTP() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    return
  }

  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
  console.log('Project ref:', projectRef)

  const sqlQuery = `
-- Drop and recreate canvas_objects table with correct structure
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

-- Also ensure other tables exist
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies for other tables
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);
  `

  const postData = JSON.stringify({ query: sqlQuery })

  const options = {
    hostname: `${projectRef}.supabase.co`,
    port: 443,
    path: '/rest/v1/rpc/query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        console.log('Response status:', res.statusCode)
        console.log('Response data:', data)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

fixDatabaseHTTP()
  .then(() => {
    console.log('Database fix completed successfully!')
  })
  .catch((error) => {
    console.error('Database fix failed:', error.message)
    console.log('\nFallback: Please run this SQL manually in Supabase Dashboard:')
    console.log(`
DROP TABLE IF EXISTS canvas_objects CASCADE;
CREATE TABLE canvas_objects (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  object_data JSONB NOT NULL,
  object_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE canvas_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own canvas objects" ON canvas_objects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own canvas objects" ON canvas_objects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own canvas objects" ON canvas_objects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own canvas objects" ON canvas_objects FOR DELETE USING (auth.uid() = user_id);
    `)
  })
