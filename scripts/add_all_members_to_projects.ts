import { prisma } from "../src/lib/prisma";

async function main() {
  const [users, projects] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } }),
    prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);

  console.log(`Found ${users.length} users and ${projects.length} projects.`);

  let added = 0;
  for (const project of projects) {
    for (const user of users) {
      const existing = await prisma.projectMember.findFirst({
        where: { projectId: project.id, userId: user.id },
      });
      if (!existing) {
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: user.id,
          },
        });
        added++;
      }
    }
  }

  console.log(`Added ${added} project memberships. All staff now have access to all projects!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
