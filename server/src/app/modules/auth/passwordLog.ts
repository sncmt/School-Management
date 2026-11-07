import type { Prisma } from "../../../../generated/prisma/client";
import type { PasswordChangeSource } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/*
 * Records a password someone set for another person (never the password): whose, for which
 * school, by whom, from where, and whether it was made up. Names are kept as they were then.
 */
export const logPasswordChange = async (
  db: Db,
  input: { targetUserId: string; schoolId: string | null; source: PasswordChangeSource; changedById: string; generated: boolean },
) => {
  const people = await db.user.findMany({
    where: { id: { in: [input.targetUserId, input.changedById] } },
    select: { id: true, fullname: true },
  });
  const nameOf = (id: string) => people.find((p) => p.id === id)?.fullname ?? "";
  await db.passwordChangeLog.create({
    data: { ...input, targetName: nameOf(input.targetUserId), changedByName: nameOf(input.changedById) },
  });
};
