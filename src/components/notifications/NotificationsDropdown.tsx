"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Trophy,
  Flame,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
  related_user_id?: string | null;
  related_post_id?: string | null;
  related_user?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface NotificationsDropdownProps {
  userId: string;
}

export default function NotificationsDropdown({
  userId,
}: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (userId) {
      fetchNotifications();

      // Subscribe to real-time notifications
      const subscription = supabase
        .channel(`notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            fetchNotifications();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            fetchNotifications();
          },
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          related_user:profiles!notifications_related_user_id_fkey(
            full_name,
            username,
            avatar_url
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error("Error in fetchNotifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        return;
      }

      // Update local state immediately for better UX
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error in markAsRead:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        return;
      }

      // Update local state immediately
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error in markAllAsRead:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-4 w-4 text-red-500 fill-current" />;
      case "comment":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "follow":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "streak":
        return <Flame className="h-4 w-4 text-orange-500" />;
      case "message":
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationContent = (notification: Notification) => {
    const relatedUser = notification.related_user;
    const userName =
      relatedUser?.full_name || relatedUser?.username || "Someone";

    switch (notification.type) {
      case "like":
        return `${userName} liked your post`;
      case "comment":
        return `${userName} commented on your post`;
      case "follow":
        return `${userName} started following you`;
      case "streak":
        return notification.title;
      case "message":
        return `${userName} sent you a message`;
      default:
        return notification.title || notification.message || "New notification";
    }
  };

  if (!userId) {
    return (
      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" sideOffset={5}>
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">
                Loading notifications...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">
                You'll see notifications here when people interact with your
                content
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 ${
                    !notification.read
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : ""
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className="flex-shrink-0 mt-1">
                      {notification.related_user?.avatar_url ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={notification.related_user.avatar_url}
                            alt={notification.related_user.full_name || "User"}
                          />
                          <AvatarFallback className="text-xs">
                            {(notification.related_user.full_name ||
                              notification.related_user.username ||
                              "U")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium leading-tight">
                        {getNotificationContent(notification)}
                      </p>
                      {notification.message &&
                        notification.message !== notification.title && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(
                          new Date(notification.created_at),
                          {
                            addSuffix: true,
                          },
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      {notification.related_user?.avatar_url && (
                        <div className="h-6 w-6 rounded-full bg-white shadow-sm border flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-2 border-t bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              Showing {Math.min(notifications.length, 50)} most recent
              notifications
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
