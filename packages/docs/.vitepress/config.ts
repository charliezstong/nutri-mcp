import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Nutri-MCP',
  description: 'Multi-source nutrition MCP server for AI assistants',
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#10b981' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Nutri-MCP' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Tools', link: '/tools/overview' },
      { text: 'API', link: '/api/providers' },
      {
        text: '0.2.0',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'GitHub', link: 'https://github.com/charliezstong/nutri-mcp' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Nutri-MCP?', link: '/guide/what-is-nutrimcp' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
          ]
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Environment Variables', link: '/guide/configuration' },
            { text: 'Claude Code Setup', link: '/guide/claude-code' },
            { text: 'HTTP Transport', link: '/guide/http-transport' },
          ]
        },
        {
          text: 'Use Cases',
          items: [
            { text: 'Examples', link: '/guide/use-cases' },
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Adding Providers', link: '/guide/custom-providers' },
            { text: 'Resilience', link: '/guide/resilience' },
          ]
        }
      ],
      '/tools/': [
        {
          text: 'Tools Reference',
          items: [
            { text: 'Overview', link: '/tools/overview' },
            { text: 'Product Tools', link: '/tools/product' },
            { text: 'Nutrition Tools', link: '/tools/nutrition' },
            { text: 'Allergen & Diet Tools', link: '/tools/allergen' },
            { text: 'Comparison Tools', link: '/tools/comparison' },
            { text: 'Price Tools', link: '/tools/price' },
            { text: 'Recipe & Meal Tools', link: '/tools/recipe' },
            { text: 'Insights Tools', link: '/tools/insights' },
            { text: 'Safety Tools', link: '/tools/safety' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Providers', link: '/api/providers' },
            { text: 'Types', link: '/api/types' },
            { text: 'Services', link: '/api/services' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/charliezstong/nutri-mcp' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/nutri-mcp' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2024 Nutri-MCP'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/charliezstong/nutri-mcp/edit/main/packages/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },

  sitemap: {
    hostname: 'https://nutri-mcp.com'
  }
})
