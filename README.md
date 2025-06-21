# Daemon Operating System Page

This website is built using the following technologies:
1. SolidJS
2. TailwindCSS
3. Typescript
4. InteractJS
5. @mysten/sui
6. @mysten/wallet-standard

## Setting up your Development Environment

### Prerequisites

1. **bun** - This is a Rust-based NPM substitute.
   _No bun? visit [bun's website](https://bun.sh) and follow their installation guide._

### Installation

Open your terminal in the `front-end` directory and run the following to install all the dependencies of the front end at once:

```bash
bun install
```

The installation process may take a couple of minutes if you have really bad wifi. Otherwise give it a couple of seconds.

## Development Workflow

To start the local server run:

```bash
bun dev
```

This command:

1. Starts your local development environment
2. Enables hot reloading, which automatically refreshes the browser when you save changes

Note: It might be a good idea to keep the terminal window open while working, as it displays important error messages and build information.

## Creating a Production Build

When preparing the project for deployment run the following command:

```bash
bun run build
```

This creates a production build in a `dist` directory. It does the following:

- Minifies and optimizes all code
- Bundles assets efficiently
- Removes development-only features
- Adds hash values to filenames for cache management

## Deployment

The `dist` folder contains all the front end files that are necessary to deploy the front end to whatever hosting service we choose like:

- Netlify
- Vercel
- Cloudflare Pages
- Other static hosting services

## Common Issues and Solutions

If you encounter problems, here are some common solutions:

1. **Command not executing:**

   - Verify you're in the correct directory
   - Run `bun install` again
   - Confirm bun is installed with `bun --version`

2. **Changes not reflecting:**

   - Ensure the development server is running
   - Check the terminal for error messages
   - Try refreshing the browser

3. **Build failures:**
   - Save all pending changes
   - Review terminal output for specific errors
   - Run `bun install` to update dependencies

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)
