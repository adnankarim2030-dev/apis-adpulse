import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { NewProjectForm } from "./NewProjectForm";

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session || session.role !== "CEO") redirect("/login");

  const [clients, staff] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "STAFF", isActive: true },
      select: { id: true, name: true, jobTitle: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell role="CEO" activePath="/ceo/projects" name={session.name} title="New Project">
      <div className="max-w-2xl">
        <NewProjectForm clients={clients} staff={staff} />
      </div>
    </AppShell>
  );
}
