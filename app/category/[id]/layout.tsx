import { CategoryHeader } from "@/components/CategoryHeader";
import { TabNav } from "@/components/TabNav";
import { getById } from "@/lib/repo/categories";
import { notFound } from "next/navigation";

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  // 从 DB 读 category（替代旧的 mockData 内存数据）
  const cat = await getById(params.id);
  if (!cat) {
    notFound();
  }

  return (
    <>
      <CategoryHeader id={params.id} />
      <TabNav id={params.id} />
      <div>{children}</div>
    </>
  );
}
