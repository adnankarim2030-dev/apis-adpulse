import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3005";

interface TestResult {
  category: string;
  name: string;
  status: "PASS" | "FAIL";
  details?: string;
  latencyMs?: number;
}

const results: TestResult[] = [];

async function logResult(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      category,
      name,
      status: "PASS",
      latencyMs: Date.now() - start,
    });
    console.log(`✅ [PASS] ${category} - ${name} (${Date.now() - start}ms)`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      category,
      name,
      status: "FAIL",
      details: errorMsg,
      latencyMs: Date.now() - start,
    });
    console.error(`❌ [FAIL] ${category} - ${name}: ${errorMsg}`);
  }
}

async function loginUser(email: string, pass: string): Promise<{ cookie: string; user: any }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Login failed with status ${res.status}: ${txt}`);
  }
  const setCookie = res.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0] || "";
  const data = await res.json();
  return { cookie, user: data.data };
}

async function runAudit() {
  console.log("=================================================");
  console.log("   APIS ENTERPRISE SYSTEM - FULL AUDIT TEST      ");
  console.log("=================================================\n");

  // 1. DATABASE & USER AUDIT
  let allUsers: any[] = [];
  await logResult("Database", "Verify Prisma connection and active users", async () => {
    allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true, name: true, role: true, passwordHash: true, jobTitle: true },
    });
    if (allUsers.length < 12) {
      throw new Error(`Expected at least 12 active users, found ${allUsers.length}`);
    }
  });

  const knownCredentials: Record<string, string> = {
    "khurram@apis.com": "Khurram#Apex94",
    "naeem@apis.com": "Naeem@Media45",
    "kashif@apis.com": "Kashif&Growth81",
    "musfira@apis.com": "Musfira!Ops63",
    "abeel@apis.com": "Abeel*Pixel74",
    "adnan@apis.com": "Adnan#Tech95",
    "noel@apis.com": "Noel$Direct58",
    "shoaib@apis.com": "Shoaib&Client41",
    "fahim@apis.com": "Fahim@Strat83",
    "fatima@apis.com": "Fatima*Design51",
    "maha@apis.com": "Maha#Reach39",
    "ozam@apis.com": "Ozam*Vector48",
  };

  // 2. AUTHENTICATION & LOGIN AUDIT FOR ALL CREDENTIALS
  const sessions: Record<string, { cookie: string; user: any }> = {};

  for (const [email, pwd] of Object.entries(knownCredentials)) {
    const userObj = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!userObj) {
      results.push({
        category: "Authentication",
        name: `User account exists (${email})`,
        status: "FAIL",
        details: "User not found in database",
      });
      continue;
    }

    await logResult("Authentication", `Login test for ${userObj.name} (${email})`, async () => {
      const match = await bcrypt.compare(pwd, userObj.passwordHash);
      if (!match) throw new Error("Bcrypt password hash does not match credentials");

      const session = await loginUser(email, pwd);
      sessions[email] = session;

      // Verify /api/auth/me returns valid session
      const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Cookie: session.cookie },
      });
      if (!meRes.ok) throw new Error(`/api/auth/me failed with ${meRes.status}`);
      const meData = await meRes.json();
      if (meData.data.email.toLowerCase() !== email.toLowerCase()) {
        throw new Error(`Identity mismatch: expected ${email}, got ${meData.data.email}`);
      }
    });
  }

  // 3. ROLE-BASED ACCESS CONTROL (RBAC) & DASHBOARD AUDIT
  const ceoSession = sessions["khurram@apis.com"];
  const staffSession = sessions["adnan@apis.com"] || Object.values(sessions).find(s => s.user.role === "STAFF");

  if (!ceoSession || !staffSession) {
    throw new Error("Missing CEO or Staff session for RBAC tests");
  }

  await logResult("RBAC & Dashboards", "CEO Dashboard endpoint (/api/dashboard/ceo)", async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/ceo`, {
      headers: { Cookie: ceoSession.cookie },
    });
    if (!res.ok) throw new Error(`CEO dashboard returned status ${res.status}`);
    const data = await res.json();
    if (!data.data || !data.data.kpis) throw new Error("Missing KPIs in CEO dashboard response");
  });

  await logResult("RBAC & Dashboards", "Staff Dashboard endpoint (/api/dashboard/staff)", async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/staff`, {
      headers: { Cookie: staffSession.cookie },
    });
    if (!res.ok) throw new Error(`Staff dashboard returned status ${res.status}`);
    const data = await res.json();
    if (!data.data) throw new Error("Missing data in Staff dashboard response");
  });

  await logResult("RBAC & Dashboards", "Staff cannot access CEO dashboard (403 forbidden check)", async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/ceo`, {
      headers: { Cookie: staffSession.cookie },
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  // 4. STAFF ROSTER AUDIT
  await logResult("Staff Management", "Staff roster endpoint (/api/staff)", async () => {
    const res = await fetch(`${BASE_URL}/api/staff`, {
      headers: { Cookie: staffSession.cookie },
    });
    if (!res.ok) throw new Error(`Staff list failed with status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.data) || data.data.length < 12) {
      throw new Error(`Expected at least 12 staff in roster, got ${data.data?.length}`);
    }
  });

  // 5. PROJECTS AUDIT: List and Create
  let testProjectId = "";
  await logResult("Projects", "Staff can create project inline (POST /api/projects)", async () => {
    const projectName = `Audit Test Project ${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffSession.cookie,
      },
      body: JSON.stringify({
        name: projectName,
        description: "Created automatically during audit verification",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Create project failed with ${res.status}: ${err}`);
    }
    const data = await res.json();
    testProjectId = data.data.id;
    if (!testProjectId) throw new Error("Project created without ID");
  });

  // 6. TASKS AUDIT: Create Task with From (startDate) and To (dueDate) Duration
  let testTaskId = "";
  await logResult("Tasks & Duration", "Create Task with From (startDate) and To (dueDate) fields", async () => {
    const today = new Date();
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    const startDate = today.toISOString();
    const dueDate = nextWeek.toISOString();

    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffSession.cookie,
      },
      body: JSON.stringify({
        projectId: testProjectId,
        title: "Audit Test Task: Verify From/To Duration",
        startDate,
        dueDate,
        assignedToId: staffSession.user.id,
        priority: "HIGH",
        estimatedHours: 4,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Create task failed with ${res.status}: ${err}`);
    }
    const data = await res.json();
    testTaskId = data.data.id;

    // Verify task stored in database with both dates
    const dbTask = await prisma.task.findUnique({
      where: { id: testTaskId },
      select: { id: true, title: true, startDate: true, dueDate: true, priority: true, status: true },
    });
    if (!dbTask) throw new Error("Task not found in DB");
    if (!dbTask.startDate) throw new Error("Task startDate (From) was not saved in DB");
    if (!dbTask.dueDate) throw new Error("Task dueDate (To) was not saved in DB");
  });

  // 7. TASK STATUS & WORKFLOW AUDIT
  await logResult("Tasks & Duration", "Update Task Status to IN_PROGRESS & COMPLETED", async () => {
    // Status to IN_PROGRESS
    const res1 = await fetch(`${BASE_URL}/api/tasks/${testTaskId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffSession.cookie,
      },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    if (!res1.ok) throw new Error(`Status update to IN_PROGRESS failed: ${res1.status}`);

    // Status to COMPLETED
    const res2 = await fetch(`${BASE_URL}/api/tasks/${testTaskId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffSession.cookie,
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (!res2.ok) throw new Error(`Status update to COMPLETED failed: ${res2.status}`);

    const dbTask = await prisma.task.findUnique({ where: { id: testTaskId } });
    if (dbTask?.status !== "COMPLETED") throw new Error(`Expected COMPLETED, got ${dbTask?.status}`);
  });

  // 8. CHAT & MESSAGING AUDIT
  const userA = sessions["khurram@apis.com"];
  const userB = sessions["abeel@apis.com"] || sessions["musfira@apis.com"];

  if (!userA || !userB) {
    throw new Error("Missing test users for Chat audit");
  }

  // 8a. General Broadcast Chat
  await logResult("Chatting & Messages", "Send message in General Announcement Channel", async () => {
    const text = `Audit general announcement: ${Date.now()}`;
    const sendRes = await fetch(`${BASE_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userA.cookie,
      },
      body: JSON.stringify({
        channelType: "GENERAL",
        channelId: "general",
        content: text,
      }),
    });
    if (!sendRes.ok) throw new Error(`Send general message failed with ${sendRes.status}`);

    // Retrieve general messages as userB
    const getRes = await fetch(`${BASE_URL}/api/messages?channelType=GENERAL&channelId=general`, {
      headers: { Cookie: userB.cookie },
    });
    if (!getRes.ok) throw new Error(`Retrieve general messages failed: ${getRes.status}`);
    const data = await getRes.json();
    const found = data.data.some((m: any) => m.content === text);
    if (!found) throw new Error("Sent message not found in general channel retrieval");
  });

  // 8b. Direct 1-on-1 Staff-to-Staff Chat
  await logResult("Chatting & Messages", "Direct 1-on-1 Staff Messaging between Khurram & Abeel", async () => {
    const directText = `Direct audit ping from ${userA.user.name} to ${userB.user.name}: ${Date.now()}`;
    
    // Sender (User A) sends to User B
    const sendRes = await fetch(`${BASE_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userA.cookie,
      },
      body: JSON.stringify({
        channelType: "DIRECT",
        channelId: userB.user.id,
        content: directText,
      }),
    });
    if (!sendRes.ok) throw new Error(`Send direct message failed with ${sendRes.status}`);

    // Receiver (User B) views direct messages with User A
    const getRes = await fetch(`${BASE_URL}/api/messages?channelType=DIRECT&channelId=${userA.user.id}`, {
      headers: { Cookie: userB.cookie },
    });
    if (!getRes.ok) throw new Error(`Receiver retrieval of direct messages failed: ${getRes.status}`);
    const data = await getRes.json();
    const found = data.data.some((m: any) => m.content === directText);
    if (!found) throw new Error("Direct message not received in recipient's 1-on-1 inbox");
  });

  // 9. CLEANUP AUDIT ARTIFACTS
  await logResult("Cleanup", "Clean up test task and project", async () => {
    if (testTaskId) {
      await prisma.task.delete({ where: { id: testTaskId } }).catch(() => {});
    }
    if (testProjectId) {
      await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
    }
  });

  console.log("\n=================================================");
  console.log("             AUDIT SUMMARY REPORT                ");
  console.log("=================================================");
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  console.log(`TOTAL TESTS : ${results.length}`);
  console.log(`PASSED      : ${passCount}`);
  console.log(`FAILED      : ${failCount}`);
  console.log(`PASS RATE   : ${((passCount / results.length) * 100).toFixed(1)}%`);
  console.log("=================================================\n");
}

runAudit()
  .catch((err) => {
    console.error("Fatal audit runner error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
