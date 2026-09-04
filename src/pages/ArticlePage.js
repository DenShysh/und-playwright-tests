// @ts-check

/**
 * Page Object Model for a UND news article (/news/<slug>).
 * Built from a live browser_snapshot of an article on https://und.com.ua/
 */
class ArticlePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Class-anchored: the count of <nav> landmarks differs between desktop and mobile,
    // so a positional index would resolve to the header nav on one of them.
    this.breadcrumbs = page.locator('nav.und-breadcrumb');
    this.title = page.getByRole('heading', { level: 1 });
    this.body = page.getByRole('article');
    this.tagLinks = page.locator('a[href*="/news/search?tag="]');
    this.relatedHeading = page.getByRole('heading', { name: 'Схожі новини', level: 3 });
    this.commentsHeading = page.getByRole('heading', { name: /Коментарі/, level: 3 });

    // Embeds are gated behind optional-cookie consent: with consent refused the site
    // renders this placeholder button instead of the third-party iframe.
    this.blockedEmbedPlaceholder = page.getByRole('button', {
      name: /accept optional cookies/i,
    });
    this.youtubeEmbed = page.locator('iframe[src*="youtube.com/embed"]');
  }

  /** @param {string} slug */
  async goto(slug) {
    await this.page.goto(`/news/${slug}`, { waitUntil: 'domcontentloaded' });
  }

  /** @param {string} name */
  metaContent(name) {
    return this.page.locator(`meta[name="${name}"]`);
  }

  /** @param {string} property */
  ogContent(property) {
    return this.page.locator(`meta[property="${property}"]`);
  }
}

module.exports = { ArticlePage };
