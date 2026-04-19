# DIVOOST Website

Global E-Commerce Specialist - Official website for DIVOOST, connecting Korean brands to Southeast Asian markets.

## 🌐 Features

- **Multi-language support**: Korean (ko), Vietnamese (vi), English (en)
- **Responsive design**: Optimized for desktop, tablet, and mobile
- **Modern aesthetic**: Black + Gold color scheme inspired by DIVOOST logo
- **Fast & Lightweight**: Pure HTML/CSS/JavaScript with no build tools required
- **SEO-friendly**: Semantic HTML with proper meta tags

## 📁 Project Structure

```
divoost-website/
├── index.html          # Main page
├── css/
│   └── style.css       # All styles
├── js/
│   ├── i18n.js         # Internationalization logic
│   └── main.js         # Main interactivity
├── lang/
│   ├── ko.json         # Korean translations
│   ├── vi.json         # Vietnamese translations
│   └── en.json         # English translations
├── images/
│   └── logo.jpg        # Company logo
└── README.md
```

## 🚀 Deploying to GitHub Pages

### Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Repository name: `divoost-website` (or any name you prefer)
4. Set to **Public** (required for free GitHub Pages)
5. Do NOT check "Add README" (we already have one)
6. Click **"Create repository"**

### Step 2: Upload Files

**Option A: Using Web Interface (Easiest)**

1. On your new repository page, click **"uploading an existing file"**
2. Drag and drop ALL files and folders from this project
3. Commit message: `Initial commit`
4. Click **"Commit changes"**

**Option B: Using Git Command Line**

```bash
cd path/to/divoost-website
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/divoost-website.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. In your repository, click **"Settings"** (top right tab)
2. In the left sidebar, click **"Pages"**
3. Under **"Source"**:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **"Save"**
5. Wait 1-2 minutes, then your site will be live at:
   ```
   https://YOUR_USERNAME.github.io/divoost-website/
   ```

### Step 4: Custom Domain (Optional - to use divoost.com)

1. In GitHub Pages settings, add **"Custom domain"**: `divoost.com`
2. Click **"Save"**
3. In your domain registrar (where divoost.com is registered), add these DNS records:

   **For root domain (divoost.com):**
   ```
   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153
   ```

   **For www subdomain:**
   ```
   Type: CNAME
   Name: www
   Value: YOUR_USERNAME.github.io
   ```

4. Wait 10-60 minutes for DNS propagation
5. Back in GitHub Pages, check **"Enforce HTTPS"**

## 🛠️ How to Edit Content

### Change Text / Translations

Edit the files in the `lang/` folder:
- `lang/ko.json` - Korean
- `lang/vi.json` - Vietnamese
- `lang/en.json` - English

Each key corresponds to `data-i18n` attributes in `index.html`.

### Change Contact Information

Open `index.html` and search for:
- Email: `bizpro@divoost.com`
- Address: search for "Số 27 đường Market Str"
- Business registration: `0110729684`

Also update in `lang/*.json` files under `footer` section.

### Change Logo

Replace `images/logo.jpg` with your new logo file.
- Recommended: PNG with transparent background
- Recommended size: 400x300px or similar aspect ratio
- Keep filename as `logo.jpg` or update references in `index.html`

### Change Colors

Open `css/style.css` and find the `:root` section at the top:

```css
:root {
    --color-gold: #f5b82f;      /* Main accent */
    --color-black: #0a0a0a;     /* Background */
    --color-blue: #0d1b2a;      /* Secondary background */
    ...
}
```

### Add New Sections

1. Add HTML section in `index.html` with a unique `id`
2. Add menu link in both desktop and mobile nav
3. Add styles in `css/style.css`
4. Add translations in all three `lang/*.json` files

## 📱 Testing Locally

Since this uses fetch() to load translations, you need a local server:

### Option 1: Python (if installed)
```bash
cd divoost-website
python3 -m http.server 8000
# Open http://localhost:8000
```

### Option 2: Node.js (if installed)
```bash
npx serve divoost-website
```

### Option 3: VS Code Live Server Extension
Install "Live Server" extension, right-click `index.html` → "Open with Live Server"

## 📧 Contact Form

The contact form currently uses `mailto:` links which opens the user's default email client. For production, consider:

- **Formspree**: https://formspree.io (free tier available)
- **Netlify Forms**: If hosting on Netlify
- **EmailJS**: https://www.emailjs.com

## 📋 Credits

- **Fonts**: Bebas Neue, Inter, Noto Sans KR (Google Fonts)
- **Design**: Custom - Black + Gold theme matching DIVOOST brand

## 📄 License

© 2026 DIVOOST. All Rights Reserved.
Business Registration No: 0110729684

---

**Company Info**
- Representative: Huệ Chi
- Address: Số 27 đường Market Str, Sunrise B, KĐT The Manor Central Park, Phường Định Công, Thành phố Hà Nội, Việt Nam
- Email: bizpro@divoost.com
