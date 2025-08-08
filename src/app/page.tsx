import Footer from "@/components/footer";
import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import {
  ArrowUpRight,
  Play,
  Heart,
  MessageCircle,
  Share2,
  Camera,
  Search,
  TrendingUp,
  BookOpen,
  Users,
  Smartphone,
} from "lucide-react";
import { createClient } from "../../supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <Hero />

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Learn Skills Like Never Before
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experience the future of skill-sharing with our TikTok-inspired
              platform designed for practical learning.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Smartphone className="w-6 h-6" />,
                title: "Vertical Video Feed",
                description: "Infinite scroll through engaging skill videos",
              },
              {
                icon: <Camera className="w-6 h-6" />,
                title: "Easy Content Creation",
                description: "Share your skills with simple video tools",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Community Driven",
                description: "Connect with learners and creators worldwide",
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "Trending Skills",
                description: "Discover what's popular and in-demand",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="text-purple-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How Talenta Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Three simple steps to start your skill-sharing journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">1. Discover Skills</h3>
              <p className="text-gray-600">
                Browse through thousands of skill videos or search for specific
                topics you want to learn.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">2. Learn & Engage</h3>
              <p className="text-gray-600">
                Watch, like, comment, and share videos. Follow your favorite
                creators and track your progress.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                3. Share Your Skills
              </h3>
              <p className="text-gray-600">
                Create and upload your own skill videos to teach others and
                build your following.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-purple-100">Active Learners</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-purple-100">Skill Videos</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-purple-100">Skill Categories</div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section id="explore" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Popular Skill Categories
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore trending skills across various categories
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              "Cooking",
              "Photography",
              "Music",
              "Art & Design",
              "Fitness",
              "Technology",
              "Language",
              "Business",
              "Crafts",
              "Gaming",
              "Beauty",
              "Gardening",
            ].map((category, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg text-center hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="text-sm font-medium text-gray-800">
                  {category}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of learners and creators sharing skills on Talenta.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-8 py-4 text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all text-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Play className="mr-2 w-5 h-5" />
            Start Learning Now
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
