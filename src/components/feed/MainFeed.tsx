"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../supabase/client";
import Post from "./Post";
import SuggestedSkills from "./SuggestedSkills";
import Trending from "./Trending";
import { Loader2 } from "lucide-react";

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
  profiles: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  user_liked?: boolean;
}

export default function MainFeed() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
  }, []);

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchPosts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let query = supabase
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
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: postsData, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error);
        return;
      }

      // Check which posts the current user has liked
      if (user && postsData) {
        const postIds = postsData.map((post) => post.id);
        const { data: likesData } = await supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id)
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
      console.error("Error in fetchPosts:", error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with suggestions and trending */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <SuggestedSkills />
        <Trending />
      </div>

      {/* Posts Feed */}
      <div className="max-w-md mx-auto">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No posts yet. Start following creators or create your first post!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Post
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
              onPostUpdate={fetchPosts}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
}
