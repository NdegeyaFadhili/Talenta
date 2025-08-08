import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import TalentaNavbar from "@/components/TalentaNavbar";
import ExploreContent from "@/components/explore/ExploreContent";

export default async function ExplorePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <>
      <TalentaNavbar />
      <ExploreContent />
    </>
  );
}
