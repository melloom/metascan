export const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
export const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
export const ADDRESS_REGEX = /\d{1,5}\s[\w\s]{1,50}(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Rd|Road|Way|Ct|Court|Pl|Place)\b[.,]?\s*(?:(?:Suite|Ste|Apt|Unit|#)\s*\w+[.,]?\s*)?(?:[A-Z][a-z]+[.,]?\s*)?(?:[A-Z]{2}\s*)?\d{5}(?:-\d{4})?/gi;
export const HOURS_REGEX = /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s:]*\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?/gi;
export const URL_REGEX = /https?:\/\/[^\s"'<>]+/g;

export const TECH_SIGNATURES: Record<string, string[]> = {
  'WordPress': ['wp-content', 'wp-includes', 'wordpress'],
  'Shopify': ['cdn.shopify.com', 'shopify.com'],
  'Wix': ['static.wixstatic.com', 'wix.com'],
  'Squarespace': ['squarespace.com', 'sqsp.net'],
  'React': ['react', '_react', '__NEXT_DATA__'],
  'Next.js': ['__NEXT_DATA__', '_next/static'],
  'Vue.js': ['vue.js', 'vue.min.js', '__vue__'],
  'Angular': ['ng-version', 'angular'],
  'jQuery': ['jquery.min.js', 'jquery-'],
  'Bootstrap': ['bootstrap.min.css', 'bootstrap.min.js'],
  'Tailwind CSS': ['tailwindcss', 'tw-'],
  'Google Analytics': ['google-analytics.com', 'gtag', 'ga.js', 'analytics.js'],
  'Google Tag Manager': ['googletagmanager.com', 'gtm.js'],
  'Facebook Pixel': ['connect.facebook.net', 'fbq('],
  'Cloudflare': ['cloudflare', 'cf-ray'],
  'Stripe': ['js.stripe.com', 'stripe.js'],
  'HubSpot': ['js.hs-scripts.com', 'hubspot'],
  'Mailchimp': ['mailchimp', 'mc.js'],
  'Intercom': ['intercom', 'intercomSettings'],
  'Hotjar': ['hotjar.com', 'hj('],
};

export const PAGE_CATEGORIES: Record<string, string[]> = {
  'About': ['about', 'about-us', 'our-story', 'who-we-are'],
  'Contact': ['contact', 'contact-us', 'get-in-touch', 'reach-us'],
  'Services': ['services', 'what-we-do', 'offerings', 'solutions'],
  'Products': ['products', 'shop', 'store', 'catalog', 'catalogue'],
  'Blog': ['blog', 'news', 'articles', 'posts', 'insights'],
  'FAQ': ['faq', 'faqs', 'help', 'support', 'questions'],
  'Team': ['team', 'our-team', 'staff', 'people', 'leadership'],
  'Careers': ['careers', 'jobs', 'hiring', 'work-with-us'],
  'Privacy': ['privacy', 'privacy-policy'],
  'Terms': ['terms', 'terms-of-service', 'tos'],
  'Portfolio': ['portfolio', 'work', 'projects', 'case-studies'],
  'Pricing': ['pricing', 'plans', 'packages', 'rates'],
  'Testimonials': ['testimonials', 'reviews', 'clients'],
  'Gallery': ['gallery', 'photos', 'images'],
  'Login': ['login', 'signin', 'sign-in', 'account'],
};
