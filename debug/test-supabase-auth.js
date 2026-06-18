import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wraqaqyqqeswufbarhcz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYXFhcXlxcWVzd3VmYmFyaGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDYxNTcsImV4cCI6MjA4ODkyMjE1N30.8MME9AjR7jupsIkaUvFAuz3VFMiYRXvhNDyk8d4DDLY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `test-client-${Math.random().toString(36).substring(7)}@gmail.com`;
  const password = 'TestPassword123!';
  
  console.log(`Attempting to sign up user: ${email}`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError.message);
    return;
  }

  console.log('Sign up successful!');
  console.log('User:', signUpData.user ? signUpData.user.email : 'null');
  console.log('Session:', signUpData.session ? 'Valid' : 'Null (email confirmation might be required)');

  console.log('Attempting to log in user...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Sign in error:', signInError.message);
  } else {
    console.log('Sign in successful!');
    console.log('Session User:', signInData.user.email);
    console.log('Access Token:', signInData.session.access_token ? 'Present' : 'None');
  }
}

run();
