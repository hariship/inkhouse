const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: 'mailtoharipriyas@gmail.com',
      username: 'haripriya',
      display_name: 'Haripriya',
      password_hash: '$2b$10$L6ZoHtk/x/ZsEJ1OKFYvH.4uLA3dg/n4dq9XYJ5CdskUeIxPBXkjC',
      role: 'admin',
      status: 'active'
    })
    .select();

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Admin created successfully!');
    console.log('Email: mailtoharipriyas@gmail.com');
    console.log('Password: inkhouse@123');
  }
}

createAdmin();
