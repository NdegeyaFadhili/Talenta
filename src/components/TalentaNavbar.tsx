"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../supabase/client";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Home,
  Search,
  Plus,
  Bell,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Compass,
} from "lucide-react";
import { useRouter } from "next/navigation";
import PostCreation from "./post/PostCreation";
import ProfileEdit from "./profile/ProfileEdit";
import NotificationsDropdown from "./notifications/NotificationsDropdown";

export default function TalentaNavbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showPostCreation, setShowPostCreation] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUnreadCounts();

      // Subscribe to real-time notifications
      const notificationsSubscription = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchUnreadCounts(),
        )
        .subscribe();

      const messagesSubscription = supabase
        .channel("messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          () => fetchUnreadCounts(),
        )
        .subscribe();

      return () => {
        notificationsSubscription.unsubscribe();
        messagesSubscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const fetchUnreadCounts = async () => {
    if (!user) return;

    // Count unread notifications
    const { count: notificationCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    // Count unread messages
    const { count: messageCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);

    setUnreadNotifications(notificationCount || 0);
    setUnreadMessages(messageCount || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handlePostCreated = () => {
    setShowPostCreation(false);
    // Navigate to dashboard to show the new post
    router.push("/dashboard");
    // Small delay to ensure navigation completes before refresh
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleProfileSaved = () => {
    setShowProfileEdit(false);
    fetchProfile();
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Talenta
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link
                href="/dashboard"
                className="flex items-center space-x-1 text-gray-700 hover:text-purple-600"
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>

              <Link
                href="/explore"
                className="flex items-center space-x-1 text-gray-700 hover:text-purple-600"
              >
                <Compass className="h-5 w-5" />
                <span>Explore</span>
              </Link>

              <Link
                href="/search"
                className="flex items-center space-x-1 text-gray-700 hover:text-purple-600"
              >
                <Search className="h-5 w-5" />
                <span>Search</span>
              </Link>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Create Post */}
              <Button
                onClick={() => setShowPostCreation(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Create</span>
              </Button>

              {/* Notifications */}
              <NotificationsDropdown userId={user?.id} />

              {/* Messages */}
              <Link href="/messages">
                <Button variant="ghost" size="icon" className="relative">
                  <MessageCircle className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                          profile?.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`
                        }
                        alt={profile?.full_name || "User"}
                      />
                      <AvatarFallback>
                        {(profile?.full_name ||
                          profile?.username ||
                          user?.email ||
                          "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {profile?.full_name && (
                        <p className="font-medium">{profile.full_name}</p>
                      )}
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push(`/profile/${user?.id}`)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowProfileEdit(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Edit Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="grid grid-cols-5 h-16">
            <Link
              href="/dashboard"
              className="flex flex-col items-center justify-center text-gray-700 hover:text-purple-600"
            >
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">Home</span>
            </Link>
            <Link
              href="/explore"
              className="flex flex-col items-center justify-center text-gray-700 hover:text-purple-600"
            >
              <Compass className="h-5 w-5" />
              <span className="text-xs mt-1">Explore</span>
            </Link>
            <Button
              onClick={() => setShowPostCreation(true)}
              className="flex flex-col items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-none h-full"
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs mt-1">Create</span>
            </Button>
            <Link
              href="/messages"
              className="flex flex-col items-center justify-center text-gray-700 hover:text-purple-600 relative"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs mt-1">Messages</span>
              {unreadMessages > 0 && (
                <Badge className="absolute top-2 right-4 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </Badge>
              )}
            </Link>
            <Link
              href={`/profile/${user?.id}`}
              className="flex flex-col items-center justify-center text-gray-700 hover:text-purple-600"
            >
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Profile</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Modals */}
      {showPostCreation && (
        <PostCreation
          onPostCreated={handlePostCreated}
          onClose={() => setShowPostCreation(false)}
        />
      )}

      {showProfileEdit && user && (
        <ProfileEdit
          userId={user.id}
          onSave={handleProfileSaved}
          onClose={() => setShowProfileEdit(false)}
        />
      )}
    </>
  );
}
