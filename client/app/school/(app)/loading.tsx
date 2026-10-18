import { SchoolLoader } from "@/components/layout/SchoolLoader";

// shown inside the menu and top bar while a page loads
export default function Loading() {
  return <SchoolLoader className="min-h-[60vh]" />;
}
