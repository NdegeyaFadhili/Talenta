"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../supabase/client";
import Post from "../feed/Post";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { TrendingUp, Clock, Heart, Flame } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

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

interface SkillCategory {
  id: string;
  name: string;
  description: string | null;
  posts_count: number;
  trending_score: number;
}

export default function ExploreContent() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("recent");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser();
    fetchCategories();

    // Check if there's a category filter in URL
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [activeTab, selectedCategory]);

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("skill_categories")
        .select("*")
        .order("posts_count", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Error in fetchCategories:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
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
        .eq("privacy_setting", "public");

      // Filter by category if selected
      if (selectedCategory) {
        query = query.eq("skill_category", selectedCategory);
      }

      // Apply sorting based on active tab
      switch (activeTab) {
        case "recent":
          query = query.order("created_at", { ascending: false });
          break;
        case "popular":
          query = query.order("likes_count", { ascending: false });
          break;
        case "trending":
          // For trending, we'll use a combination of recent posts with high engagement
          query = query
            .gte(
              "created_at",
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            )
            .order("likes_count", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      query = query.limit(50);

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

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(
      categoryName === selectedCategory ? null : categoryName,
    );
    router.push(
      categoryName === selectedCategory
        ? "/explore"
        : `/explore?category=${encodeURIComponent(categoryName)}`,
    );
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "recent":
        return <Clock className="h-4 w-4" />;
      case "popular":
        return <Heart className="h-4 w-4" />;
      case "trending":
        return <Flame className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-16 z-10 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Explore Skills</h1>

          {/* Skill Categories */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Popular Categories</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={
                    selectedCategory === category.name ? "default" : "outline"
                  }
                  className={`cursor-pointer hover:bg-purple-100 ${
                    selectedCategory === category.name
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                      : ""
                  }`}
                  onClick={() => handleCategoryClick(category.name)}
                >
                  {category.name} ({category.posts_count})
                </Badge>
              ))}
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="recent"
                className="flex items-center space-x-2"
              >
                {getTabIcon("recent")}
                <span>Recent</span>
              </TabsTrigger>
              <TabsTrigger
                value="popular"
                className="flex items-center space-x-2"
              >
                {getTabIcon("popular")}
                <span>Popular</span>
              </TabsTrigger>
              <TabsTrigger
                value="trending"
                className="flex items-center space-x-2"
              >
                {getTabIcon("trending")}
                <span>Trending</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Posts Content */}
      <div className="max-w-md mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {selectedCategory
                ? `No posts found in ${selectedCategory} category.`
                : "No posts found. Be the first to share your skills!"}
            </p>
            {selectedCategory && (
              <Button
                variant="outline"
                onClick={() => handleCategoryClick(selectedCategory)}
                className="mt-4"
              >
                Show All Posts
              </Button>
            )}
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
