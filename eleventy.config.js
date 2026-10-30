export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/sitemap.xml");
  eleventyConfig.addPassthroughCopy({
    "node_modules/swiper/swiper-bundle.min.js": "assets/vendor/swiper/swiper-bundle.min.js",
    "node_modules/swiper/swiper-bundle.min.css": "assets/vendor/swiper/swiper-bundle.min.css",
    "node_modules/goo-motion-library/dist/goo.bundle.js": "assets/vendor/goo/goo.bundle.js",
  });
  return {
    dir: { input: "src", output: "_site" },
    // Captured pages are plain HTML; do not run them through a template engine.
    htmlTemplateEngine: false,
    markdownTemplateEngine: false,
  };
}
