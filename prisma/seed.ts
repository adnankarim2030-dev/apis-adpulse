import "dotenv/config";
import { PrismaClient, type Priority, type ProjectStatus, type TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

// Standalone seed script (run via `npm run db:seed`). It intentionally does
// NOT import from src/lib so it has zero dependency on Next.js path aliases
// or app runtime checks (e.g. AUTH_SECRET) — it only needs DATABASE_URL.
//
// All data below is clearly fake development data per spec section 60.
// Every account uses the same obviously-fake password so it's easy to log
// in and explore; change it before using this seed shape anywhere real.

const prisma = new PrismaClient();
const SEED_PASSWORD = "ChangeMe123!";

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(17, 0, 0, 0);
  return date;
}

async function main() {
  console.log("Seeding APIS Phase 1 development data…");
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  // --- Wipe existing data (dev only — safe because this is seed data) ---
  await prisma.activityLog.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // --- CEO ---
  const ceo = await prisma.user.create({
    data: {
      name: "Faisal Qureshi",
      email: "ceo@adpulse.com",
      passwordHash,
      role: "CEO",
      jobTitle: "Chief Executive Officer",
      department: "Executive",
    },
  });

  // --- Staff ---
  const [ahmed, sara, bilal, hina, usman] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ahmed Khan",
        email: "ahmed.khan@adpulse.com",
        passwordHash,
        role: "STAFF",
        jobTitle: "Senior Graphic Designer",
        department: "Creative",
      },
    }),
    prisma.user.create({
      data: {
        name: "Sara Malik",
        email: "sara.malik@adpulse.com",
        passwordHash,
        role: "STAFF",
        jobTitle: "Social Media Manager",
        department: "Social Media",
      },
    }),
    prisma.user.create({
      data: {
        name: "Bilal Ahmed",
        email: "bilal.ahmed@adpulse.com",
        passwordHash,
        role: "STAFF",
        jobTitle: "Web Developer",
        department: "Digital",
      },
    }),
    prisma.user.create({
      data: {
        name: "Hina Sheikh",
        email: "hina.sheikh@adpulse.com",
        passwordHash,
        role: "STAFF",
        jobTitle: "Copywriter",
        department: "Creative",
      },
    }),
    prisma.user.create({
      data: {
        name: "Usman Tariq",
        email: "usman.tariq@adpulse.com",
        passwordHash,
        role: "STAFF",
        jobTitle: "Account Manager",
        department: "Client Servicing",
      },
    }),
  ]);
  const staff = [ahmed, sara, bilal, hina, usman];

  // --- Clients ---
  const [zaman, metro, indus, falcon, aroma] = await Promise.all([
    prisma.client.create({
      data: { name: "Zaman Textiles", company: "Zaman Textiles Pvt Ltd", contactPerson: "Kamran Zaman", email: "kamran@zamantextiles.com", phone: "+92-300-1112233" },
    }),
    prisma.client.create({
      data: { name: "Metro Foods", company: "Metro Foods Ltd", contactPerson: "Ayesha Noor", email: "ayesha@metrofoods.pk", phone: "+92-300-2223344" },
    }),
    prisma.client.create({
      data: { name: "Indus Bank", company: "Indus Bank Ltd", contactPerson: "Waqas Farooq", email: "waqas.farooq@indusbank.pk", phone: "+92-300-3334455" },
    }),
    prisma.client.create({
      data: { name: "Falcon Motors", company: "Falcon Motors Pvt Ltd", contactPerson: "Bushra Iqbal", email: "bushra@falconmotors.pk", phone: "+92-300-4445566" },
    }),
    prisma.client.create({
      data: { name: "Aroma Bakers", company: "Aroma Bakers & Co", contactPerson: "Imran Sethi", email: "imran@aromabakers.pk", phone: "+92-300-5556677" },
    }),
  ]);

  // --- Projects ---
  interface ProjectSeed {
    name: string;
    code: string;
    client: typeof zaman;
    department: string;
    priority: Priority;
    status: ProjectStatus;
    dueInDays: number;
    manager: typeof ahmed;
    members: (typeof ahmed)[];
    description: string;
    objectives: string;
  }

  const projectSeeds: ProjectSeed[] = [
    {
      name: "Brand Refresh 2026",
      code: "ADP-2026-01",
      client: zaman,
      department: "Creative",
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueInDays: 5,
      manager: ahmed,
      members: [ahmed, hina],
      description: "Full visual identity refresh for Zaman Textiles ahead of their new retail rollout.",
      objectives: "Deliver updated logo system, brand guidelines and packaging templates.",
    },
    {
      name: "Ramadan Campaign",
      code: "ADP-2026-02",
      client: metro,
      department: "Social Media",
      priority: "CRITICAL",
      status: "AT_RISK",
      dueInDays: 2,
      manager: sara,
      members: [sara, hina],
      description: "Multi-platform Ramadan content push across Instagram, Facebook and TikTok.",
      objectives: "Publish 20 pieces of content and grow engagement by 15% over last Ramadan.",
    },
    {
      name: "Digital Onboarding Microsite",
      code: "ADP-2026-03",
      client: indus,
      department: "Digital",
      priority: "HIGH",
      status: "DELAYED",
      dueInDays: -3,
      manager: bilal,
      members: [bilal],
      description: "Self-service onboarding microsite for Indus Bank's new digital savings product.",
      objectives: "Ship a mobile-first microsite integrated with the bank's KYC API.",
    },
    {
      name: "Product Launch Video",
      code: "ADP-2026-04",
      client: falcon,
      department: "Production",
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      dueInDays: 1,
      manager: usman,
      members: [ahmed, usman],
      description: "Hero launch film for Falcon Motors' new SUV variant.",
      objectives: "Deliver a 60-second hero cut plus three social cutdowns.",
    },
    {
      name: "Packaging Redesign",
      code: "ADP-2026-05",
      client: aroma,
      department: "Creative",
      priority: "MEDIUM",
      status: "PLANNING",
      dueInDays: 30,
      manager: ahmed,
      members: [ahmed],
      description: "Refreshed packaging line for Aroma Bakers' bestselling product range.",
      objectives: "Concept, test and finalize new packaging across 6 SKUs.",
    },
    {
      name: "Eid Collection Shoot",
      code: "ADP-2026-06",
      client: zaman,
      department: "Production",
      priority: "MEDIUM",
      status: "COMPLETED",
      dueInDays: -10,
      manager: ahmed,
      members: [ahmed, hina],
      description: "Studio and location shoot for the Zaman Textiles Eid collection.",
      objectives: "Deliver 200 retouched images and 4 short-form videos.",
    },
    {
      name: "Loyalty App Social Push",
      code: "ADP-2026-07",
      client: metro,
      department: "Social Media",
      priority: "LOW",
      status: "NOT_STARTED",
      dueInDays: 20,
      manager: sara,
      members: [sara],
      description: "Awareness campaign for Metro Foods' new loyalty app.",
      objectives: "Drive 5,000 app installs through organic and paid social.",
    },
    {
      name: "Annual Report Design",
      code: "ADP-2026-08",
      client: indus,
      department: "Creative",
      priority: "MEDIUM",
      status: "ON_HOLD",
      dueInDays: 15,
      manager: hina,
      members: [hina, ahmed],
      description: "Design and layout of Indus Bank's annual report.",
      objectives: "Deliver a print-ready 60-page annual report.",
    },
    {
      name: "Dealer Network Website",
      code: "ADP-2026-09",
      client: falcon,
      department: "Digital",
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueInDays: 8,
      manager: bilal,
      members: [bilal, usman],
      description: "Dealer locator and inventory website for Falcon Motors' national network.",
      objectives: "Launch dealer locator covering all 40 dealerships.",
    },
    {
      name: "Festive Hamper Campaign",
      code: "ADP-2026-10",
      client: aroma,
      department: "Social Media",
      priority: "HIGH",
      status: "AT_RISK",
      dueInDays: 0,
      manager: sara,
      members: [sara, hina],
      description: "Festive hamper gifting campaign across social and influencer channels.",
      objectives: "Coordinate 10 influencer posts and a festive content calendar.",
    },
  ];

  const taskTitlesByDepartment: Record<string, string[]> = {
    Creative: ["Concept moodboard", "First draft design", "Client revisions round 1", "Final artwork export", "Brand guideline update", "Internal design review"],
    "Social Media": ["Content calendar draft", "Caption copywriting", "Creative asset batch", "Boosted post setup", "Monthly performance recap", "Community management sweep"],
    Digital: ["Wireframes", "Frontend build", "API integration", "QA pass", "Staging deployment", "Analytics setup"],
    Production: ["Shot list", "Shoot day logistics", "Rough cut edit", "Color grade & sound", "Final delivery render", "Client screening"],
    "Client Servicing": ["Client kickoff call", "Status report", "Approval follow-up", "Budget reconciliation", "Client debrief", "Contract renewal check-in"],
  };

  const priorityCycle: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "MEDIUM"];

  let totalTasks = 0;
  for (const seed of projectSeeds) {
    const project = await prisma.project.create({
      data: {
        name: seed.name,
        code: seed.code,
        clientId: seed.client.id,
        projectManagerId: seed.manager.id,
        department: seed.department,
        startDate: daysFromNow(seed.dueInDays - 21),
        expectedCompletionDate: daysFromNow(seed.dueInDays),
        priority: seed.priority,
        status: seed.status,
        progressPercent: seed.status === "COMPLETED" ? 100 : seed.status === "NOT_STARTED" || seed.status === "PLANNING" ? 0 : [20, 35, 45, 60, 75][Math.floor(Math.random() * 5)],
        description: seed.description,
        objectives: seed.objectives,
        createdById: ceo.id,
        members: { create: seed.members.map((m) => ({ userId: m.id })) },
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "PROJECT",
        entityId: project.id,
        projectId: project.id,
        actorId: ceo.id,
        action: "PROJECT_CREATED",
        metadata: { name: project.name },
      },
    });

    // Non-null assertion is safe here: "Creative" is always present in the
    // map literal above, so the fallback can never actually be undefined.
    const titles = (taskTitlesByDepartment[seed.department] ?? taskTitlesByDepartment.Creative)!;
    const isProjectComplete = seed.status === "COMPLETED";
    const isProjectFuture = seed.status === "PLANNING" || seed.status === "NOT_STARTED";

    for (let i = 0; i < titles.length; i++) {
      // Non-null assertions below are safe: every index is produced by `% length`
      // against a non-empty array, so it is always in bounds.
      const assignee = seed.members[i % seed.members.length]!;
      const priority = priorityCycle[i % priorityCycle.length]!;

      let status: TaskStatus;
      let taskDueOffset: number;
      let progress: number;

      if (isProjectComplete) {
        status = "COMPLETED";
        taskDueOffset = seed.dueInDays - (titles.length - i);
        progress = 100;
      } else if (isProjectFuture) {
        status = "NOT_STARTED";
        taskDueOffset = seed.dueInDays - (titles.length - i) * 2;
        progress = 0;
      } else if (i === 0) {
        // First task of every active project is already done.
        status = "COMPLETED";
        taskDueOffset = seed.dueInDays - titles.length;
        progress = 100;
      } else if (i === titles.length - 1 && seed.dueInDays <= 3) {
        // Last task of an urgent project is overdue or due imminently — this
        // is what should be surfacing on "Needs Attention" / "My Day".
        status = "IN_PROGRESS";
        taskDueOffset = seed.dueInDays;
        progress = 40;
      } else {
        status = i % 3 === 0 ? "ON_HOLD" : "IN_PROGRESS";
        taskDueOffset = seed.dueInDays - (titles.length - i - 1);
        progress = [20, 40, 55, 70][i % 4]!;
      }

      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: `${titles[i]} — ${seed.name}`,
          description: `${titles[i]} for the ${seed.name} project.`,
          assignedToId: assignee.id,
          createdById: ceo.id,
          priority,
          status,
          startDate: daysFromNow(taskDueOffset - 4),
          dueDate: daysFromNow(taskDueOffset),
          estimatedHours: [4, 8, 12, 16, 20][i % 5]!,
          actualHours: status === "COMPLETED" ? [4, 8, 12, 16, 20][i % 5]! : undefined,
          progressPercent: progress,
          completedAt: status === "COMPLETED" ? daysFromNow(taskDueOffset - 1) : null,
        },
      });
      totalTasks += 1;

      await prisma.activityLog.create({
        data: {
          entityType: "TASK",
          entityId: task.id,
          projectId: project.id,
          taskId: task.id,
          actorId: assignee.id,
          action: status === "COMPLETED" ? "TASK_STATUS_CHANGED" : "TASK_PROGRESS_UPDATED",
          metadata: { title: task.title, progress },
        },
      });
    }
  }

  console.log(`Seed complete: 1 CEO, ${staff.length} staff, ${projectSeeds.length} clients-worth of projects, ${totalTasks} tasks.`);
  console.log("\nLogin with any of these (password for all: " + SEED_PASSWORD + "):");
  console.log("  CEO   → ceo@adpulse.com");
  for (const member of staff) console.log(`  Staff → ${member.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
