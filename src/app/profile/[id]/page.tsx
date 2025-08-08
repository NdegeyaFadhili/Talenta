import { createClient } from "../../../../supabase/server";
import UserProfile from "../../../components/profile/UserProfile";
import TalentaNavbar from "../../../components/TalentaNavbar";
import { notFound } from "next/navigation";

interface ProfilePageProps {
  params: {
    id: string;
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Check if the profile exists
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", params.id)
    .single();

  if (error || !profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <TalentaNavbar />
      <div className="pt-16">
        <UserProfile userId={params.id} currentUserId={currentUser?.id} />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, bio")
    .eq("id", params.id)
    .single();

  const displayName = profile?.full_name || profile?.username || "User Profile";

  return {
    title: `${displayName} - Talenta`,
    description: profile?.bio || `View ${displayName}'s profile on Talenta`,
  };
}
