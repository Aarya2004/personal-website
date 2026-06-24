import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { personal } from '../data/personal';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: `${personal.name} — Blog`,
    description: 'Writing on small models, AI agents, evals, fine-tuning, and systems engineering.',
    site: context.site ?? 'https://aaryap.com',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
      categories: post.data.tags,
      author: post.data.author ?? personal.name,
    })),
    customData: '<language>en-us</language>',
  });
}
