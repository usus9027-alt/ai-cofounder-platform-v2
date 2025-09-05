import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  name?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  user_id: string
  content: string
  role: 'user' | 'assistant'
  created_at: string
}

export interface CanvasObject {
  id: number
  user_id: string
  object_data: Record<string, unknown>
  object_type: string
  created_at: string
}

export interface Project {
  id: number
  user_id: string
  name: string
  description?: string
  status: string
  created_at: string
  updated_at: string
}

const database = {
  async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) return null
    return data
  },

  async createUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User | null> {
    console.log('Database createUser called with:', user)
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase createUser error:', error)
      return null
    }
    console.log('Supabase createUser success:', data)
    return data
  },

  async getMessages(userId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    
    if (error) return []
    return data
  },

  async createMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single()
    
    if (error) return null
    return data
  },

  async getCanvasObjects(userId: string): Promise<CanvasObject[]> {
    const { data, error } = await supabase
      .from('canvas_objects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    
    if (error) return []
    return data
  },

  async createCanvasObject(canvasObject: Omit<CanvasObject, 'id' | 'created_at'>): Promise<CanvasObject | null> {
    const { data, error } = await supabase
      .from('canvas_objects')
      .insert(canvasObject)
      .select()
      .single()
    
    if (error) return null
    return data
  },

  async updateCanvasObject(id: number, updates: Partial<CanvasObject>): Promise<CanvasObject | null> {
    const { data, error } = await supabase
      .from('canvas_objects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) return null
    return data
  },

  async deleteCanvasObject(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('canvas_objects')
      .delete()
      .eq('id', id)
    
    return !error
  },

  async getProjects(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) return []
    return data
  },

  async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single()
    
    if (error) return null
    return data
  }
}

export { database }
export default database
