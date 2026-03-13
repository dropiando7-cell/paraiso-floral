const { execSync } = require('child_process');
execSync('npx vercel env pull .env.vercel.test --yes --environment production', { stdio: 'inherit' });
