import { prisma } from "../src/lib/prisma";

async function run() {
  const khurram = await prisma.user.findUnique({ where: { email: "khurram@apis.com" } });
  const ceo = await prisma.user.findUnique({ where: { email: "ceo@adpulse.com" } });
  if (ceo && khurram) {
    await prisma.task.updateMany({ where: { assignedToId: ceo.id }, data: { assignedToId: khurram.id } });
    await prisma.task.updateMany({ where: { createdById: ceo.id }, data: { createdById: khurram.id } });
    await prisma.projectMember.deleteMany({ where: { userId: ceo.id } });
    await prisma.statusRequest.updateMany({ where: { requestedById: ceo.id }, data: { requestedById: khurram.id } });
    await prisma.statusRequest.updateMany({ where: { requestedToId: ceo.id }, data: { requestedToId: khurram.id } });
    await prisma.user.delete({ where: { id: ceo.id } });
    console.log("Successfully removed duplicate ceo@adpulse.com!");
  } else {
    console.log("No duplicate found or already removed.");
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
