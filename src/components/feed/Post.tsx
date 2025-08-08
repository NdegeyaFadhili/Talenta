"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "../../../supabase/client";
import Link from "next/link";

interface PostProps {
  post: {
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
  };
  onLike: (postId: string, isLiked: boolean) => void;
  onComment: (postId: string, content: string) => void;
  onPostUpdate?: () => void;
  currentUser: any;
}

export default function Post({
  post,
  onLike,
  onComment,
  onPostUpdate,
  currentUser,
}: PostProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();

  const handleLike = () => {
    if (!currentUser) return;
    onLike(post.id, post.user_liked || false);
  };

  const handleComment = async () => {
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await onComment(post.id, commentText);
    setCommentText("");
    setIsSubmitting(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Check out this ${post.skill_category} skill!`,
        text: post.content,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (error) {
        console.error("Error updating post:", error);
        return;
      }

      // Create notification for post update
      await supabase.from("notifications").insert({
        user_id: currentUser.id,
        type: "content",
        title: "Post Updated",
        message: "You updated your post",
        related_post_id: post.id,
      });

      setIsEditing(false);
      onPostUpdate?.();
    } catch (error) {
      console.error("Error in handleEdit:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);

      if (error) {
        console.error("Error deleting post:", error);
        return;
      }

      // Create notification for post deletion
      await supabase.from("notifications").insert({
        user_id: currentUser.id,
        type: "content",
        title: "Post Deleted",
        message: "You deleted your post",
      });

      onPostUpdate?.();
    } catch (error) {
      console.error("Error in handleDelete:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = currentUser && currentUser.id === post.user_id;

  return (
    <div className="bg-white border-b border-gray-100 min-h-screen snap-start">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${post.profiles.id}`}>
            <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage
                src={
                  post.profiles.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.profiles.id}`
                }
                alt={post.profiles.full_name || "User"}
              />
              <AvatarFallback>
                {(post.profiles.full_name ||
                  post.profiles.username ||
                  "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link
              href={`/profile/${post.profiles.id}`}
              className="font-semibold text-sm hover:text-purple-600 transition-colors"
            >
              {post.profiles.username || post.profiles.full_name || "Anonymous"}
            </Link>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
        {isOwner ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Post
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Post</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="What's on your mind?"
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditContent(post.content || "");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleEdit}
                        disabled={!editContent.trim() || isUpdating}
                      >
                        {isUpdating ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Post
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this post? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Media Content */}
      <div className="relative">
        {post.media_url && (
          <div className="aspect-[9/16] bg-black flex items-center justify-center">
            {post.media_type === "video" ? (
              <video
                src={post.media_url}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            ) : (
              <img
                src={post.media_url}
                alt="Post content"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        {/* Skill Category Badge */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            {post.skill_category}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-4">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full ${post.user_liked ? "text-red-500" : "text-white"} hover:scale-110 transition-transform`}
            onClick={handleLike}
          >
            <Heart
              className={`h-6 w-6 ${post.user_liked ? "fill-current" : ""}`}
            />
          </Button>
          <div className="text-white text-xs text-center font-medium">
            {post.likes_count}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:scale-110 transition-transform"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <div className="text-white text-xs text-center font-medium">
            {post.comments_count}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:scale-110 transition-transform"
            onClick={handleShare}
          >
            <Share2 className="h-6 w-6" />
          </Button>
          <div className="text-white text-xs text-center font-medium">
            {post.shares_count}
          </div>
        </div>
      </div>

      {/* Caption */}
      {post.content && (
        <div className="p-4">
          <p className="text-sm">{post.content}</p>
        </div>
      )}

      {/* Comments Section */}
      {showComments && currentUser && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex space-x-2">
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleComment()}
              className="flex-1"
            />
            <Button
              onClick={handleComment}
              disabled={!commentText.trim() || isSubmitting}
              size="sm"
            >
              Post
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
