# BOTH GOOD Website

The official website for BOTH GOOD, an indie game studio from Brooklyn, NY. This is a modern React-based web application showcasing the studio's games and providing social media links.

## 🛠️ Tech Stack

- **React 19.1.0** - Modern React with the latest features
- **Vite 7.0.6** - Fast build tool and development server
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **PostCSS & Autoprefixer** - CSS processing and vendor prefixes
- **PNPM** - Fast, disk space efficient package manager

## 📁 Project Structure

```
both-good-web/
├── public/                     # Static assets served at root level
│   ├── imgs/                   # Image assets
│   │   ├── BG logo.png        # Main site logo
│   │   ├── GGG_Bot.png        # Game image (bottom layer)
│   │   ├── GGG_Top.png        # Game image (top layer)
│   │   ├── starBg_0.jpg       # Background starfield image
│   │   └── [social icons...]  # Social media icons
│   ├── favicon files...       # Various favicon formats
│   └── site.webmanifest      # Web app manifest
├── src/                      # React application source code
│   ├── components/           # Reusable React components
│   │   ├── JigglyText.jsx   # Animated text component
│   │   ├── GameImages.jsx   # Game showcase with hover effects
│   │   └── SocialIcons.jsx  # Social media links component
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # React application entry point
│   └── index.css            # Global styles with Tailwind directives
├── golf-presskit/           # Standalone press kit (separate from React app)
│   └── presskit.html        # Static HTML press kit page
├── PressStyle.css           # CSS for the press kit (legacy, not React)
├── vite.config.js           # Vite build configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
└── package.json             # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (version 18 or higher recommended)
- **PNPM** (this project uses PNPM as the package manager)

If you don't have PNPM installed:
```bash
npm install -g pnpm
```

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd both-good-web
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development server**
   ```bash
   pnpm dev
   ```

   This will start Vite's development server, typically at `http://localhost:5173`

### Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production (outputs to `dist/` directory)
- `pnpm preview` - Preview the production build locally

## 🎯 What is Vite?

**Vite** (pronounced "veet", French for "fast") is a modern build tool that provides:

- **Fast Cold Start**: Development server starts instantly
- **Hot Module Replacement (HMR)**: Changes appear immediately without full page reload
- **Optimized Builds**: Uses Rollup for production builds with automatic code splitting
- **ES Module Support**: Native ES modules in development, bundled for production

### How Vite Works in This Project

1. **Development**: When you run `pnpm dev`, Vite serves your files directly as ES modules
2. **File Processing**: 
   - `.jsx` files are transformed to JavaScript on-the-fly
   - CSS imports are processed and injected
   - Static assets in `public/` are served from root path
3. **Production**: `pnpm build` creates optimized bundles in the `dist/` directory

## 🎨 Styling with Tailwind CSS

This project uses **Tailwind CSS**, a utility-first CSS framework. Instead of writing custom CSS classes, you compose designs using utility classes directly in your HTML/JSX.

### Tailwind Configuration

The `tailwind.config.js` includes:
- **Custom Fonts**: 
  - `font-barrio` - Barrio font family for headings
  - `font-pixel` - Pixelify Sans for pixel/retro styling
- **Custom Animation**: `animate-jiggle` for the text animation effect
- **Content Scanning**: Tailwind scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}` for class usage

### Example Usage
```jsx
// Instead of writing CSS classes like .button { padding: 1rem; background: blue; }
// You use utility classes directly:
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
  Click me
</button>
```

### Global Styles
The `src/index.css` file contains:
- Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`)
- Custom base styles for body, images, links, and headings
- Component classes like `.jiggly` for the text animation

## 🖼️ Assets and Public Directory

### How Vite Handles Static Assets

- **Public Directory**: Files in `public/` are served from the root path
  - `public/imgs/logo.png` becomes `/imgs/logo.png` in your app
  - Perfect for assets that don't need processing (images, icons, manifests)

- **Import vs Public**: 
  - Use `import` for assets that should be processed/optimized by Vite
  - Use `/public-path` for assets that should remain unchanged


## 📰 Press Kit (Standalone Section)

The project includes a separate press kit that's **not part of the React application**:

- **Location**: `golf-presskit/presskit.html`
- **Styling**: Uses `PressStyle.css` (not Tailwind)
- **Purpose**: Static HTML press kit for "Golf Boxing" game
- **Independence**: Completely separate from the main React app

This press kit includes:
- Game fact sheet with developer info
- Video embeds
- Photo galleries with responsive grid layouts
- Logo downloads
- Responsive design for mobile devices

## 🔧 Development Tips

### For Developers New to Vite:

1. **Fast Refresh**: Changes to React components appear instantly
2. **Import Paths**: Use relative imports (`./Component`) or absolute public paths (`/imgs/image.png`)
3. **Environment**: Vite provides `import.meta.env` for environment variables
4. **Dev Tools**: React DevTools work normally with Vite

### For Developers New to Tailwind:

1. **Utility Classes**: Instead of writing CSS, use classes like `text-center`, `bg-black`, `hover:scale-110`
2. **Responsive Design**: Use prefixes like `md:text-3xl` for medium screens and up
3. **Custom Styles**: Add custom utilities in `index.css` using `@layer components`
4. **IntelliSense**: Install Tailwind CSS IntelliSense extension for VS Code

### Common Tasks:

- **Adding Images**: Place in `public/imgs/` and reference as `/imgs/filename.png`
- **Styling Components**: Use Tailwind classes in `className` props
- **Custom Animations**: Add to `tailwind.config.js` like the existing `jiggle` animation
- **New Components**: Create in `src/components/` and import in `App.jsx`

## 🌐 Deployment

The build command (`pnpm build`) creates a `dist/` directory with:
- Optimized and minified JavaScript bundles
- Processed CSS files
- Static assets with cache-busting hashes
- An `index.html` that references all generated files

This `dist/` directory can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## 🐛 Troubleshooting

### Common Issues:

1. **Images not loading**: Check that images are in `public/imgs/` and paths start with `/`
2. **Tailwind classes not working**: Ensure PostCSS is processing CSS correctly
3. **Component not updating**: Check for syntax errors in JSX
4. **Build failures**: Check console for missing dependencies or syntax errors

### Development Server Issues:
- **Port conflicts**: Vite will automatically try different ports if 5173 is busy
- **Cache issues**: Clear browser cache or restart dev server
- **PNPM vs NPM**: This project uses PNPM, ensure you're not mixing package managers

## 📚 Learning Resources

- **Vite Documentation**: https://vitejs.dev/
- **React Documentation**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Modern JavaScript**: Understanding ES6+ features will help with React development