import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import TalentaNavbar from "@/components/TalentaNavbar";
import ExploreContent from "@/components/explore/ExploreContent";
import Footer from "@/components/footer";

export default async function ExplorePage() {
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
        <ExploreContent />
      </div>
      <Footer />
    </div>
  );
}
