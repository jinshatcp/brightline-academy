# Brightline Academy Website

A high-converting, SEO-optimized, modern website for **Brightline Academy**, an online tuition center for Grades 6-12.

## 🚀 Getting Started

### Prerequisites
Make sure you have **Node.js** installed (version 18.17.0 or later).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/brightline-academy.git
    cd brightline
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Running Locally

To start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

To create an optimized production build:

```bash
npm run build
```

To start the production server after building:

```bash
npm start
```

## 🛠️ Tech Stack
-   **Framework**: Next.js 14 (App Router)
-   **Styling**: Tailwind CSS
-   **UI Components**: Shadcn UI (Radix Primitives)
-   **Icons**: Lucide React
-   **Validation**: Zod + React Hook Form

## 📁 Project Structure
-   `src/app`: Page routes and layouts.
-   `src/components/ui`: Reusable UI components (buttons, cards, inputs).
-   `src/components/sections`: Landing page sections (Hero, Features).
-   `src/components/forms`: Interactive forms (Lead Capture).

## 📄 Pages
-   **Home**: `/` - Hero, features, and lead capture.
-   **About**: `/about` - Mission and methodology.
-   **Courses**: `/courses` - Curriculum details.
-   **Contact**: `/contact` - Contact info and form.
-   **Book Demo**: `/book-demo` - Dedicated booking page.
