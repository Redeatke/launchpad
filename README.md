# 🚀 LaunchPad — Job Application Assistant

LaunchPad is an AI-powered job application assistant designed to help you aggregate roles, tailor resumes, generate cover letters, and draft outreach emails, all from a unified dashboard.

## 🛠️ Tech Stack & Dependencies

The application is built on top of a modern, lightweight frontend stack:
- **Core**: HTML5, Vanilla CSS, and modern JavaScript.
- **Bundler & Dev Server**: [Vite](https://vite.dev/) (v8+) for fast development and optimized builds.
- **Dependencies**:
  - `mammoth`: For parsing and reading `.docx` files.
  - `papaparse`: For CSV parsing and processing.
  - `pdfjs-dist`: For parsing and reading `.pdf` files.

---

## 🚀 Getting Started

Follow these steps to run the application locally on your machine.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (LTS version recommended).

### 1. Install Dependencies

In the root directory of the project, run:

```bash
npm install
```

### 2. Run the Development Server

Start the local Vite development server:

```bash
npm run dev
```

The app will compile and start running. By default, it will be accessible at:
👉 **[http://localhost:5173](http://localhost:5173)**

### 3. Build for Production

To build the project into static files for production hosting (output will be in the `/dist` directory):

```bash
npm run build
```

### 4. Preview the Production Build

To preview the generated production build locally:

```bash
npm run preview
```
