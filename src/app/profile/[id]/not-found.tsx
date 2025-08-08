import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { User } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Profile Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          The profile you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/dashboard">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
