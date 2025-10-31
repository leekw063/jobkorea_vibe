import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ydaqccbvionvjbvefuln.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkYXFjY2J2aW9udmpidmVmdWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDQwNjQsImV4cCI6MjA3NjY4MDA2NH0.QKGWUtLpXa0sk6cj0Z4DAi7F45D_Zr48SD4oewvdDsA';

const supabase = createClient(supabaseUrl, supabaseKey);

export function getSupabase() {
  return supabase;
}

export async function saveResume(resumeData) {
  try {
    const { data, error } = await getSupabase()
      .from('resumes')
      .insert([resumeData])
      .select();
    
    if (error) {
      console.error('BasicError saving resume:', error);
      throw new Error(`Failed to save resume: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No data returned from insert operation');
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in saveResume:', error);
    throw error;
  }
}

export async function getResumes(filters = {}) {
  try {
    let query = getSupabase()
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching resumes:', error);
      throw new Error(`Failed to fetch resumes: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getResumes:', error);
    throw error;
  }
}

export async function updateResumeStatus(id, status) {
  try {
    const { data, error } = await getSupabase()
      .from('resumes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating resume status:', error);
      throw new Error(`Failed to update resume status: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('Resume not found');
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in updateResumeStatus:', error);
    throw error;
  }
}
