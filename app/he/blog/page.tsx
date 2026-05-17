import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  created_at: string;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, created_at")
    .eq("published", true)
    .eq("lang", "he")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }

  return data || [];
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));
}

export default async function HebrewBlogPage() {
  const posts = await getBlogPosts();

  return (
    <main dir="rtl" className="bg-white">

      {/* ✅ HERO */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-white px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            בלוג מקצועי
          </h1>

          <p className="text-lg text-slate-200 leading-relaxed mb-10">
            תובנות מעשיות על יבוא מזון, private label, וסורסינג גלובלי.
            ניסיון מהשטח — לא תאוריה.
          </p>

          {/* ✅ CTA */}
          <Link
            href="/he/contact"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold transition"
          >
            רוצים להתחיל ייבוא? דברו איתנו →
          </Link>
        </div>
      </section>


      {/* ✅ POSTS */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">

          {posts.length === 0 ? (
            <p className="text-center text-slate-500">
              אין פוסטים כרגע
            </p>
          ) : (
            <div className="space-y-12">

              {posts.map((post) => (
                <article key={post.id} className="group">

                  <div className="text-sm text-slate-500 mb-2">
                    {formatDate(post.created_at)}
                  </div>

                  <h2 className="text-3xl font-bold text-slate-900 mb-3">
                    <Link
                      href={`/he/blog/${post.slug}`}
                      className="group-hover:text-orange-600 transition"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  <p className="text-slate-700 leading-relaxed mb-4">
                    {post.excerpt}
                  </p>

                  <Link
                    href={`/he/blog/${post.slug}`}
                    className="text-orange-600 font-semibold hover:text-orange-700 transition"
                  >
                    קרא עוד →
                  </Link>

                </article>
              ))}

            </div>
          )}
        </div>
      </section>


      {/* ✅ BOTTOM CTA (VERY IMPORTANT) */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">

          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            רוצים להתחיל פרויקט סורסינג?
          </h3>

          <p className="text-slate-600 mb-8">
            נשמח להבין את הצורך ולבדוק התאמה לספקים.
          </p>

          <div className="flex justify-center gap-4">

            <Link
              href="/he/contact"
              className="bg-orange-500 text-white px-6 py-3 rounded-md font-semibold hover:bg-orange-600 transition"
            >
              השאירו פרטים
            </Link>

            <a
              href="https://wa.me/972525222291"
              target="_blank"
              className="border border-slate-300 px-6 py-3 rounded-md hover:border-slate-500 transition"
            >
              WhatsApp
            </a>

          </div>

        </div>
      </section>

    </main>
  );
}