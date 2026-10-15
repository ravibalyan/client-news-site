import { randomBytes, pbkdf2Sync, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const value = (flag: string) => args[args.indexOf(flag) + 1];
const name = (value('--name') || '').trim().slice(0,120);
const email = (value('--email') || '').trim().toLowerCase().slice(0,254);
const remote = args.includes('--remote');
if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Usage: npm run admin:create -- --name "Editor Name" --email editor@example.test');
  process.exit(1);
}
const password = randomBytes(24).toString('base64url');
const salt = randomUUID();
const hash = pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
const sqlQuote = (s:string) => `'${s.replaceAll("'", "''")}'`;
const sql = `INSERT INTO admin_users(id,name,email,password_hash,role,active) SELECT ${sqlQuote(randomUUID())},${sqlQuote(name)},${sqlQuote(email)},${sqlQuote(`pbkdf2$310000$${salt}$${hash}`)},'super_admin',1 WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE role='super_admin') RETURNING id;`;
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js','d1','execute','news-site',remote?'--remote':'--local',`--command=${sql}`], { encoding:'utf8' });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status || 1);
if (!/"results"\s*:\s*\[\s*\{\s*"id"\s*:/.test(result.stdout || '')) {
  console.error('A Super Admin already exists. No account was created.');
  process.exit(1);
}
console.log(`\nFirst Super Admin created in ${remote ? 'remote' : 'local'} D1. Copy this one-time password now; it will not be shown again:`);
console.log(`Email: ${email}\nPassword: ${password}`);
