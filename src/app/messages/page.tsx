import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { ChatWorkbench } from "@/components/chat/ChatWorkbench";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const staffUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: session.userId },
    },
    select: { id: true, name: true, jobTitle: true, department: true },
    orderBy: { name: "asc" },
  });

  const channels = [
    {
      id: "general",
      name: "All Team Chat 📢",
      type: "GENERAL" as const,
      subtitle: "AdPulse company-wide discussion",
    },
    ...staffUsers.map((s) => ({
      id: s.id,
      name: s.name,
      type: "DIRECT" as const,
      subtitle: s.jobTitle || s.department || "Staff Member",
      avatarName: s.name,
    })),
  ];

  return (
    <AppShell role={session.role} activePath="/messages" name={session.name} userId={session.userId} title="Team Messages & Chat">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-text">
              Staff Chats & Discussions 💬
            </h2>
            <p className="text-xs text-muted">
              Direct 1-on-1 team chats, voice notes, and instant HD video calls.
            </p>
          </div>
        </div>

        <ChatWorkbench
          currentUserId={session.userId}
          currentUserName={session.name}
          channels={channels}
        />
      </div>
    </AppShell>
  );
}
