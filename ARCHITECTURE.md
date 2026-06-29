## Whisper - Architecture

### Language
**All visible text in English.** No Dutch or other languages. This includes UI labels, button text, status messages, and console logs.

### Technology Stack

| Layer       | Technology                  | Why                                                              |
|-------------|-----------------------------|------------------------------------------------------------------|
| Framework   | Next.js (App Router)        | Speed, SEO-ready, perfect React integration                     |
| Styling     | Tailwind CSS                | Precise colors and generous whitespace                          |
| Fonts       | Google Fonts (via next/font) | Seamless Playfair, Crimson Pro and Inter implementation        |
| Nostr Lib   | nostr-tools@2.7.2           | Protocol interaction per architecture                           |
| State       | Zustand                     | Lightweight store for relay buffer and follow status            |

### Design Principles
1. **Typography:**
   - Playfair Display: Headings (H1, H2)
   - Crimson Pro: Body text and event content
   - Inter: Interface elements (buttons, meta info)

2. **Whitespace:** Generous padding/margins for calm, unhurried reading experience

3. **Colors:**
   - Background: Light #f9f9f7
   - Text: Deep antracite #2d2d2d
   - No pure black/white

### Code Structure

```
/app
  /components
    /ui             -- Inter-based interface elements (buttons, inputs)
    /feed
      PublicFeed.tsx  -- Filtered: non-followed users with engagement
      PrivateFeed.tsx -- Filtered: followed users + unfollow buttons
    /layout
      Shell.tsx     -- Background #f9f9f7, global padding, header
  /hooks
    useNostr.ts     -- Subscription logic for wss://relay.sovereignresonance.org
    useFollows.ts   -- Zustand store + kind:3 event management
  /lib
    nostr.ts        -- SimplePool init, RELAY_URL constant
  globals.css       -- CSS vars, font assignments per element type
  layout.tsx        -- Font loading via next/font/google
  page.tsx          -- Root: Shell + PublicFeed
```

### Feeds

#### Public Feed (Feed)
- Shows events with engagement (replies/roots)
- Filters out posts from followed users
- Shows events only from non-followed users

#### Private Feed (Following)
- Shows list of followed users with Unfollow button
- Shows events from followed users

### Technical Implementation
- Follow list stored on relay as `kind: 3` events
- Using subscriptions instead of sync queries for better reliability
- Follow status managed in Zustand store, loaded from relay
