# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Development
To run the app in a development environment, use:
`npm run dev`

### Building
To build the app for production, use:
`npm run build`

### Preview
To preview the production build, use:
`npm run preview`

## Code Architecture

This is a React and Electron application. The main process for Electron is in `dist-electron/main.js`. The React application code is located in the `client` directory. The project uses Vite for building and development.
