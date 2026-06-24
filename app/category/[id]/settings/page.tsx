import { SettingsView } from "@/components/SettingsView";

export default function SettingsPage({ params }: { params: { id: string } }) {
  return <SettingsView categoryId={params.id} />;
}