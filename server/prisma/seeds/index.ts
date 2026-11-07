
import { seedModules } from './seedModules';
import { seedPermissions } from './seedPermissions';
import { backfillFreeModules } from './backfillFreeModules';
import { PrismaClient } from '../../generated/prisma/client';
import { seedPlatformAdmin } from './seedPlatformAdmin';
import { seedPackages } from './seedPackages';

export async function runSeed(prisma: PrismaClient) {
  await seedModules(prisma);
  await seedPackages(prisma);
  await seedPermissions(prisma);
  await backfillFreeModules(prisma);
  await seedPlatformAdmin(prisma);  
}