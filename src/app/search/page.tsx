import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import TalentaNavbar from "@/components/TalentaNavbar";
import SearchContent from "@/components/search/SearchContent";
import Footer from "@/components/footer";

export default async function SearchPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TalentaNavbar />
      <div className="flex-1">
        <SearchContent />
      </div>
      <Footer />
    </div>
  );
}
