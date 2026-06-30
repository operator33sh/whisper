# Whisper

![Whisper demo image](https://image.nostr.build/02880c4e8ee41d6f68d67462eb81bb05c084916449a5f4b817a5fb7ae1e62bb5.png)

Whisper is a [Nostr](https://nostr.com) client built around a single principle: your attention belongs to you.

Most social media is designed to maximise engagement — to keep you scrolling, reacting, and performing for an audience. Whisper is the opposite. It strips away follower counts, like buttons, algorithmic feeds, and all the other mechanics that turn communication into a competition for attention and validation.

What remains is the signal: words and ideas from people you have chosen to follow, presented without friction or noise.

**Manifesto:** [sovereignresonance.org](https://sovereignresonance.org)  
**Demo:** [whisper.sovereignresonance.org](https://whisper.sovereignresonance.org)

## Getting started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

The dev server runs at [http://localhost:3000](http://localhost:3000).

## Login

Whisper uses your Nostr private key (`nsec`) to sign events. Your key never leaves your device — it is stored in `localStorage` and used locally to publish posts and follows.

Don't have a Nostr account yet? [Register at start.nostr.net](https://start.nostr.net/).
