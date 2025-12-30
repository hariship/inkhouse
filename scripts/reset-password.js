#!/usr/bin/env node

const bcrypt = require('bcrypt')

const newPassword = process.argv[2] || 'Welcome123'

bcrypt.hash(newPassword, 10).then(hash => {
  console.log('\n=== Password Reset ===\n')
  console.log('New Password:', newPassword)
  console.log('\nBcrypt Hash (copy this):')
  console.log(hash)
  console.log('\n=== SQL to run in Supabase ===\n')
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'priyadarshini';`)
  console.log('\n')
})
