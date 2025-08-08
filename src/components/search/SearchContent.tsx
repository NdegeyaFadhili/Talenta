"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Search, Users, FileText } from "lucide-react";
import Link from "next/link";
import Post from "../feed/Post";

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  posts_count: number;
}

interface PostData {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  skill_category: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  user_liked?: boolean;
}

export default function SearchContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      setUsers([]);
      setPosts([]);
    }
  }, [searchQuery, activeTab]);

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      if (activeTab === "users") {
        await searchUsers();
      } else {
        await searchPosts();
      }
    } catch (error) {
      console.error("Error in search:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) {
        console.error("Error searching users:", error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error("Error in searchUsers:", error);
    }
  };

  const searchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles!posts_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("privacy_setting", "public")
        .or(
          `content.ilike.%${searchQuery}%,skill_category.ilike.%${searchQuery}%`,
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error searching posts:", error);
        return;
      }

      // Check which posts the current user has liked
      if (currentUser && postsData) {
        const postIds = postsData.map((post) => post.id);
        const { data: likesData } = await supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", currentUser.id)
          .in("post_id", postIds);

        const likedPostIds = new Set(
          likesData?.map((like) => like.post_id) || [],
        );

        const postsWithLikes = postsData.map((post) => ({
          ...post,
          user_liked: likedPostIds.has(post.id),
        }));

        setPosts(postsWithLikes);
      } else {
        setPosts(postsData || []);
      }
    } catch (error) {
      console.error("Error in searchPosts:", error);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUser) return;

    try {
      if (isLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("post_id", postId);
      } else {
        await supabase
          .from("likes")
          .insert({ user_id: currentUser.id, post_id: postId });

        // Create notification for like
        const post = posts.find((p) => p.id === postId);
        if (post && post.user_id !== currentUser.id) {
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            type: "like",
            title: "New Like",
            message: "Someone liked your post",
            related_user_id: currentUser.id,
            related_post_id: postId,
          });
        }
      }

      // Update local state
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                user_liked: !isLiked,
                likes_count: isLiked
                  ? post.likes_count - 1
                  : post.likes_count + 1,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!currentUser || !content.trim()) return;

    try {
      await supabase.from("comments").insert({
        user_id: currentUser.id,
        post_id: postId,
        content: content.trim(),
      });

      // Create notification for comment
      const post = posts.find((p) => p.id === postId);
      if (post && post.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          type: "comment",
          title: "New Comment",
          message: "Someone commented on your post",
          related_user_id: currentUser.id,
          related_post_id: postId,
        });
      }

      // Update local state
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, comments_count: post.comments_count + 1 }
            : post,
        ),
      );
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Search</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search for users, posts, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full"
            />
          </div>
        </div>

        {/* Search Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Posts</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchQuery.trim()
                    ? "No users found matching your search."
                    : "Start typing to search for users..."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.id}`}
                    className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={
                            user.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
                          }
                          alt={user.full_name || "User"}
                        />
                        <AvatarFallback>
                          {(user.full_name ||
                            user.username ||
                            "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 hover:text-purple-600 transition-colors">
                          {user.full_name || user.username || "Anonymous"}
                        </h3>
                        {user.username && user.full_name && (
                          <p className="text-gray-600">@{user.username}</p>
                        )}
                        {user.bio && (
                          <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                            {user.bio}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{user.followers_count} followers</span>
                          <span>{user.posts_count} posts</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchQuery.trim()
                    ? "No posts found matching your search."
                    : "Start typing to search for posts..."}
                </p>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                {posts.map((post) => (
                  <Post
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onComment={handleComment}
                    onPostUpdate={() => handleSearch()}
                    currentUser={currentUser}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
