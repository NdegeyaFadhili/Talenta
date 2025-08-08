import Link from "next/link";
import { Twitter, Linkedin, Instagram, Youtube } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Platform Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#features"
                  className="text-gray-600 hover:text-purple-600"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#explore"
                  className="text-gray-600 hover:text-purple-600"
                >
                  Explore Skills
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-purple-600"
                >
                  Feed
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Trending
                </Link>
              </li>
            </ul>
          </div>

          {/* Community Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Creators
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Learners
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Success Stories
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Creator Guidelines
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Safety
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-purple-600">
                  Copyright
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-200">
          <div className="text-gray-600 mb-4 md:mb-0">
            © {currentYear} Talenta. All rights reserved.
          </div>

          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-purple-500">
              <span className="sr-only">Twitter</span>
              <Twitter className="h-6 w-6" />
            </a>
            <a href="#" className="text-gray-400 hover:text-purple-500">
              <span className="sr-only">Instagram</span>
              <Instagram className="h-6 w-6" />
            </a>
            <a href="#" className="text-gray-400 hover:text-purple-500">
              <span className="sr-only">YouTube</span>
              <Youtube className="h-6 w-6" />
            </a>
            <a href="#" className="text-gray-400 hover:text-purple-500">
              <span className="sr-only">LinkedIn</span>
              <Linkedin className="h-6 w-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
