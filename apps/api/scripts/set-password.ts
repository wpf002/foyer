/**
 * Sets the password for an existing user, e.g. the dev@foyer.local account that owns
 * projects made before sign-in existed. The password is read from stdin so it stays out of shell history.
 *
 *   pnpm --filter @foyer/api set-password dev@foyer.local
 */
import { createInterface } from 'node:readline/promises';
import { hash } from '@node-rs/argon2';
import { prisma } from '@foyer/db';
import { credentialsSchema } from '../src/auth';

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('Usage: set-password <email>');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question('New password: ');
  rl.close();
  const parsed = credentialsSchema.safeParse({ email, password });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
  const user = await prisma.user.update({
    where: { email: parsed.data.email },
    data: { passwordHash: await hash(parsed.data.password) },
  });
  console.log(`Password set for ${user.email}`);
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
