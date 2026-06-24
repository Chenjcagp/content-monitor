import { AnalysisView } from "@/components/AnalysisView";

export default function AnalysisPage({ params }: { params: { id: string } }) {
  return <AnalysisView categoryId={params.id} />;
}