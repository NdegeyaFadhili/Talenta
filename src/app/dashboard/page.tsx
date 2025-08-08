import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import MainFeed from "@/components/feed/MainFeed";
import TalentaNavbar from "@/components/TalentaNavbar";
import Footer from "@/components/footer";

export default async function Dashboard() {
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
        <MainFeed />
      </div>
      <Footer />
    </div>
  );
}
