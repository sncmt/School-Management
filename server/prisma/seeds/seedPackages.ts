import type { PrismaClient } from '../../generated/prisma/client';
import { packagesData } from './data/packages.data';

export async function seedPackages(prisma: PrismaClient) {
  for (const p of packagesData) {
    await prisma.subscriptionPackage.upsert({
      where: { code: p.code },
      update: {},   // never overwrite: the platform admin edits these later
      create: p,
    });
  }
}