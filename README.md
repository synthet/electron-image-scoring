# Electron Image Scoring Gallery

An AI-powered image gallery application built with Electron, React, and Vite. This application provides a high-performance interface for browsing and filtering images scored by the [Image Scoring](https://github.com/synthet/image-scoring) core engine.

## Features

- 🖼️ **High-Performance Gallery**: Smooth scrolling and instant previews.
- 📂 **Folder Tree**: Intuitive navigation of your image library.
- 🔍 **Advanced Filtering**: Filter by quality scores (MUSIQ, LIQE), keywords, and more.
- 📸 **RAW Support**: Integrated NEF/RAW viewing capability.
- 🗄️ **Firebird Integration**: Directly connects to the shared image scoring database.

## Prerequisites

- **Node.js**: (v18 or higher recommended)
- **Shared Database**: This app expects a Firebird database managed by the core [Image Scoring](https://github.com/synthet/image-scoring) project.

## Getting Started

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone git@github.com:synthet/electron-image-scoring.git
    cd electron-image-scoring
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the application**:
    ```bash
    ./run.bat
    ```
    *Or via npm:*
    ```bash
    npm run dev
    ```

## Development

- `npm run dev`: Launch the app in development mode with HMR.
- `npm run build`: Build the production application for Windows.
- `npm run lint`: Run ESLint to check for code quality issues.
