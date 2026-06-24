import { ContentView } from "@/components/ContentView";

export default function ContentPage({ params }: { params: { id: string } }) {
  return <ContentView categoryId={params.id} />;
}