import { Sidebar } from "~/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-screen w-screen">
      <Sidebar />
      {children}
    </section>
  );
}
