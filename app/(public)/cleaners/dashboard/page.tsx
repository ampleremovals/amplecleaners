import { CleanerAppNotice } from "@/components/shared/CleanerAppNotice";

export const metadata = { title: "Cleaner dashboard", robots: { index: false } };

export default function CleanerDashboardPage() {
  return <CleanerAppNotice title="Your jobs live in the app" />;
}
