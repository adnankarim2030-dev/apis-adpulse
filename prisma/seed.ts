import "dotenv/config";
import { PrismaClient, type Priority, type ProjectStatus, type TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(17, 0, 0, 0);
  return date;
}

export const TEAM_ROSTER = [
  // 3 Admins with Full Access & Project Assignment
  {
    name: "Khurram Jaffrani",
    email: "khurram@apis.com",
    role: "CEO" as const,
    jobTitle: "Chief Executive Officer",
    department: "Executive Leadership",
    password: "Khurram#Apex94",
  },
  {
    name: "Noel Francis",
    email: "noel@apis.com",
    role: "CEO" as const, // Full Admin access per user instruction
    jobTitle: "Business Director",
    department: "Client Accounts & Strategy",
    password: "Noel$Direct58",
  },
  {
    name: "Syeda Musfira",
    email: "musfira@apis.com",
    role: "CEO" as const, // Full Admin access per user instruction
    jobTitle: "Client Service & Operations Executive",
    department: "Client Accounts & Operations",
    password: "Musfira!Ops63",
  },

  // Team Staff Members
  {
    name: "Adnan Karim",
    email: "adnan@apis.com",
    role: "STAFF" as const,
    jobTitle: "Head of AI, Webapp Software Developer",
    department: "Product & Design Studio",
    password: "Adnan#Tech95",
  },
  {
    name: "Syed Abeel Ahmed",
    email: "abeel@apis.com",
    role: "STAFF" as const,
    jobTitle: "Head Of Design & Digital",
    department: "Product & Design Studio",
    password: "Abeel*Pixel74",
  },
  {
    name: "Naeem Ahmed",
    email: "naeem@apis.com",
    role: "STAFF" as const,
    jobTitle: "Head Of Media Buying & Planning",
    department: "Operations & Media",
    password: "Naeem@Media45",
  },
  {
    name: "Kashif Aghani",
    email: "kashif@apis.com",
    role: "STAFF" as const,
    jobTitle: "Manager Business Development",
    department: "Client Accounts & Strategy",
    password: "Kashif&Growth81",
  },
  {
    name: "Shoaib Jaffrani",
    email: "shoaib@apis.com",
    role: "STAFF" as const,
    jobTitle: "Head Of Client Service",
    department: "Enterprise Accounts",
    password: "Shoaib&Client41",
  },
  {
    name: "Fahim Nisar",
    email: "fahim@apis.com",
    role: "STAFF" as const,
    jobTitle: "Digital Strategy Planner",
    department: "Client Accounts & Strategy",
    password: "Fahim@Strat83",
  },
  {
    name: "Maha",
    email: "maha@apis.com",
    role: "STAFF" as const,
    jobTitle: "Media Executive",
    department: "Operations & Media",
    password: "Maha#Reach39",
  },
  {
    name: "Fatima",
    email: "fatima@apis.com",
    role: "STAFF" as const,
    jobTitle: "Creative Executive",
    department: "Product & Design Studio",
    password: "Fatima*Design51",
  },
  {
    name: "Ozam",
    email: "ozam@apis.com",
    role: "STAFF" as const,
    jobTitle: "Graphics Designer",
    department: "Product & Design Studio",
    password: "Ozam*Vector48",
  },
  {
    name: "Faizan Ahmed",
    email: "faizan@apis.com",
    role: "STAFF" as const,
    jobTitle: "Media Operations Executive",
    department: "Operations & Media",
    password: "Faizan#Pulse72",
  },
  {
    name: "Khizar Jaffrani",
    email: "khizar@apis.com",
    role: "STAFF" as const,
    jobTitle: "Client Service Executive",
    department: "Client Accounts & Strategy",
    password: "Khizar*Apex68",
  },
];

async function main() {
  console.log("Seeding APIS Phase 1 with official AdPulse IMC team…");

  // --- Wipe all old/dummy data ---
  await prisma.activityLog.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.blocker.deleteMany();
  await prisma.statusRequest.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // --- Create Official Users ---
  const createdUsers: Record<string, any> = {};

  for (const member of TEAM_ROSTER) {
    const passwordHash = await bcrypt.hash(member.password, 12);
    const user = await prisma.user.create({
      data: {
        name: member.name,
        email: member.email,
        passwordHash,
        role: member.role,
        jobTitle: member.jobTitle,
        department: member.department,
      },
    });
    createdUsers[member.email] = user;
  }

  const khurram = createdUsers["khurram@apis.com"];
  const noel = createdUsers["noel@apis.com"];
  const musfira = createdUsers["musfira@apis.com"];
  const adnan = createdUsers["adnan@apis.com"];
  const abeel = createdUsers["abeel@apis.com"];
  const naeem = createdUsers["naeem@apis.com"];
  const kashif = createdUsers["kashif@apis.com"];
  const shoaib = createdUsers["shoaib@apis.com"];
  const fahim = createdUsers["fahim@apis.com"];
  const maha = createdUsers["maha@apis.com"];
  const fatima = createdUsers["fatima@apis.com"];
  const ozam = createdUsers["ozam@apis.com"];
  const ahmed = createdUsers["ahmed.khan@adpulse.com"];

  const allUsersList = Object.values(createdUsers);

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
  const projectSeeds = [
    {
      name: "Brand Refresh 2026",
      code: "ADP-2026-01",
      client: zaman,
      department: "Creative",
      priority: "HIGH" as Priority,
      status: "IN_PROGRESS" as ProjectStatus,
      dueInDays: 5,
      manager: abeel,
      description: "Full visual identity refresh for Zaman Textiles ahead of their new retail rollout.",
      objectives: "Deliver updated logo system, brand guidelines and packaging templates.",
    },
    {
      name: "Ramadan Campaign",
      code: "ADP-2026-02",
      client: metro,
      department: "Social Media",
      priority: "CRITICAL" as Priority,
      status: "AT_RISK" as ProjectStatus,
      dueInDays: 2,
      manager: naeem,
      description: "Multi-platform Ramadan content push across Instagram, Facebook and TikTok.",
      objectives: "Publish 20 pieces of content and grow engagement by 15% over last Ramadan.",
    },
    {
      name: "Digital AI Management Platform",
      code: "ADP-2026-03",
      client: indus,
      department: "Digital",
      priority: "HIGH" as Priority,
      status: "DELAYED" as ProjectStatus,
      dueInDays: -3,
      manager: adnan,
      description: "Internal AI-powered workflow system and API integration for project intelligence.",
      objectives: "Ship a mobile-first intelligent platform integrated with staff workflow.",
    },
    {
      name: "Product Launch Video",
      code: "ADP-2026-04",
      client: falcon,
      department: "Production",
      priority: "CRITICAL" as Priority,
      status: "IN_PROGRESS" as ProjectStatus,
      dueInDays: 1,
      manager: noel,
      description: "Hero launch film for Falcon Motors' new SUV variant.",
      objectives: "Deliver a 60-second hero cut plus three social cutdowns.",
    },
    {
      name: "Packaging Redesign",
      code: "ADP-2026-05",
      client: aroma,
      department: "Creative",
      priority: "MEDIUM" as Priority,
      status: "PLANNING" as ProjectStatus,
      dueInDays: 30,
      manager: fatima,
      description: "Refreshed packaging line for Aroma Bakers' bestselling product range.",
      objectives: "Concept, test and finalize new packaging across 6 SKUs.",
    },
    {
      name: "Eid Collection Shoot",
      code: "ADP-2026-06",
      client: zaman,
      department: "Production",
      priority: "MEDIUM" as Priority,
      status: "COMPLETED" as ProjectStatus,
      dueInDays: -10,
      manager: shoaib,
      description: "Studio and location shoot for the Zaman Textiles Eid collection.",
      objectives: "Deliver 200 retouched images and 4 short-form videos.",
    },
    {
      name: "Loyalty App Social Push",
      code: "ADP-2026-07",
      client: metro,
      department: "Social Media",
      priority: "LOW" as Priority,
      status: "NOT_STARTED" as ProjectStatus,
      dueInDays: 20,
      manager: maha,
      description: "Awareness campaign for Metro Foods' new loyalty app.",
      objectives: "Drive 5,000 app installs through organic and paid social.",
    },
    {
      name: "Annual Report Design",
      code: "ADP-2026-08",
      client: indus,
      department: "Creative",
      priority: "MEDIUM" as Priority,
      status: "ON_HOLD" as ProjectStatus,
      dueInDays: 15,
      manager: ozam,
      description: "Design and layout of Indus Bank's annual report.",
      objectives: "Deliver a print-ready 60-page annual report.",
    },
    {
      name: "Dealer Network Website",
      code: "ADP-2026-09",
      client: falcon,
      department: "Digital",
      priority: "HIGH" as Priority,
      status: "IN_PROGRESS" as ProjectStatus,
      dueInDays: 8,
      manager: kashif,
      description: "Dealer locator and inventory website for Falcon Motors' national network.",
      objectives: "Launch dealer locator covering all 40 dealerships.",
    },
    {
      name: "Festive Hamper Campaign",
      code: "ADP-2026-10",
      client: aroma,
      department: "Social Media",
      priority: "HIGH" as Priority,
      status: "AT_RISK" as ProjectStatus,
      dueInDays: 0,
      manager: musfira,
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
        createdById: khurram.id,
        // All team members are linked to projects so everyone can collaborate and create tasks!
        members: { create: allUsersList.map((m) => ({ userId: m.id })) },
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "PROJECT",
        entityId: project.id,
        projectId: project.id,
        actorId: khurram.id,
        action: "PROJECT_CREATED",
        metadata: { name: project.name },
      },
    });

    const titles = (taskTitlesByDepartment[seed.department] ?? taskTitlesByDepartment.Creative)!;
    const isProjectComplete = seed.status === "COMPLETED";
    const isProjectFuture = seed.status === "PLANNING" || seed.status === "NOT_STARTED";

    for (let i = 0; i < titles.length; i++) {
      const assignee = allUsersList[i % allUsersList.length]!;
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
        status = "COMPLETED";
        taskDueOffset = seed.dueInDays - titles.length;
        progress = 100;
      } else if (i === titles.length - 1 && seed.dueInDays <= 3) {
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
          createdById: khurram.id,
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

  console.log(`\n========================================================================`);
  console.log(`   APIS TEAM CREDENTIALS DIRECTORY (OFFICIAL 13 MEMBERS)                 `);
  console.log(`========================================================================`);
  console.log(`[3 FULL ADMINS / PROJECT ASSIGNERS]:`);
  console.log(`  1. Khurram Jaffrani  | khurram@apis.com | Password: Khurram#Apex94`);
  console.log(`  2. Noel Francis      | noel@apis.com    | Password: Noel$Direct58`);
  console.log(`  3. Syeda Musfira     | musfira@apis.com | Password: Musfira!Ops63`);
  console.log(`\n[STAFF MEMBERS]:`);
  for (const m of TEAM_ROSTER.slice(3)) {
    console.log(`  • ${m.name.padEnd(18)} | ${m.email.padEnd(24)} | Password: ${m.password}`);
  }
  console.log(`========================================================================\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
