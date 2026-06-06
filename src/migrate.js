import { execSync } from 'child_process';

console.log('Adatbázis táblák létrehozása...');
execSync('node_modules/.bin/prisma db push --accept-data-loss', {
  stdio: 'inherit',
  cwd: '/home/container',
});
console.log('Kész.');
