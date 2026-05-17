import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  created_at: string;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, created_at')
    .eq('published', true)
    .eq('lang', 'he')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }

  return data || [];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default async function HebrewBlogPage() {
  const posts = await getBlogPosts();

  return (
    <main dir="rtl" className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-white px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl md:text-6xl font-bold tracking-tight text-white">
            בלוג
          </h1>

          <p className="mb-12 text-lg md:text-xl leading-relaxed text-slate-200">
            עדכונים, טיפים, וחדשות מעולם ההזמנות בישראל ובאירופה.
            סיפורים של מיזמים שהצליחו, טרנדים בשוק, וכיצד לבנות יחסים חזקים.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="px-6 py-20 bg-white">
        <div className="mx-auto max-w-4xl">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-slate-600">
                אין פוסטים פורסומים כרגע. בואו נשוב בקרוב!
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="border-b border-slate-200 pb-8 last:border-b-0"
                >
                  <div className="mb-2 text-sm text-slate-500">
                    {formatDate(post.created_at)}
                  </div>
                  <h2 className="mb-3 text-3xl font-bold text-slate-900">
                    <Link
                      href={`/he/blog/${post.slug}`}
                      className="hover:text-blue-600 transition"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mb-4 text-slate-700 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/he/blog/${post.slug}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition"
                  >
                    קרא עוד →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
