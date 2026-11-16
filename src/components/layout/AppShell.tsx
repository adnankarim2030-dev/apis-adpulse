import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { GlobalChatPopup } from "@/components/chat/GlobalChatPopup";
import type { Role } from "@/types";

export function AppShell({
  role,
  activePath,
  name,
  userId,
  title,
  children,
}: {
  role: Role;
  activePath: string;
  name: string;
  userId?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0]">
      {/* Desktop Light/Dark Gradient Sidebar */}
      <Sidebar role={role} activePath={activePath} />

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col pb-20 md:pb-8">
        <Topbar name={name} role={role} title={title} />
        <main className="flex-1 px-4 py-5 md:px-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileTabBar role={role} activePath={activePath} />

      {/* Real-time Global Chat Notification Popup & Quick Chat Drawer */}
      <GlobalChatPopup currentUserName={name} currentUserId={userId} activePath={activePath} />
    </div>
  );
}
