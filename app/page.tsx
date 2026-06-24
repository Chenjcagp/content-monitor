import { redirect } from "next/navigation";
import { CATEGORIES } from "@/lib/mockData";

export default function Home() {
  redirect(`/category/${CATEGORIES[0].id}/content`);
}