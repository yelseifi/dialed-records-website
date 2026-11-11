# Dialed Records website

The site for Dialed Records, an LA minimal-house label. It's static: `index.html`, `main.js` and `style.css`, with no build step. Vercel deploys `main` to dialed-records.com, so whatever lands on `main` is live within a minute.

Requests usually come from Youssef or Josh Lee as a short message, like a text: "add this event", "new release, here's the link". Do the research yourself: find the date, venue, lineup, ticket link and artwork online before asking. Keep the change to what was asked.

## Where content lives

All content lives in the data section at the top of `main.js`. Edit the data. Don't touch the render code unless the request needs it.

| Const | What it is |
|---|---|
| `FEATURED` | The release that takes over the hero under a spotlight |
| `RELEASES` | The catalog, newest first |
| `EVENTS` | Shows, oldest first |
| `MERCH` | Links to dialedrecords.bandcamp.com product pages |
| `GALLERY` | Instagram tiles; images go in `images/gallery/` |

After any edit, run `node --check main.js`.

## Events

```js
{
  date: 'Dec 3\n2026',                 // 'Mon D\nYYYY', 3-letter month
  name: 'Alci · Anthea · Priku',       // headliners, joined with ' · '
  subtitle: 'Dialed Records Art Basel', // who presents it, as the flyer or promoter says it
  venue: 'Sable · Miami, FL',          // 'Venue · City, ST'
  lineup: 'Alci · Anthea · Priku · Josh Lee', // the full lineup; '' hides the row
  link: 'https://…',                   // tickets; '' shows a dimmed TBA button
  recap: '',                           // Instagram post, used once the show has passed
},
```

- Keep the array in date order.
- Never delete past events. Each event moves itself under "Past Events" at noon the day after. Its button then becomes "Recap", linked to `recap`, or no button if `recap` is empty. When someone sends the Instagram post for a past show, put it in `recap`.
- A TBA date uses `name: 'TBA'`, `venue: 'Venue TBA · City, ST'` and `lineup: 'Lineup TBA'`.
- Ticket links usually live on notapromoter.com, posh.vip or ra.co. The NotAPromoter page's `og:image` is the flyer, which gives the date, time, address and full lineup.
- posh.vip and ra.co refuse automated fetching. Utopia Fridays posh links follow `posh.vip/e/utopia-fridays-YYYY-M-D-12-0`, where D is the event date plus one, because the slug encodes the midnight start. If you can't confirm a link, ask for it rather than guessing.

## A new release

1. **Add it to the top of `RELEASES`:**

   ```js
   { catalog: 'DRX030', title: '…', artist: '…', image: 'images/release-drx030.jpg', beatport: 'https://lnk.to/…' },
   ```

   The `beatport` field holds whatever smart link we're given (lnk.to or ffm.to). The name is historical.

2. **Get the artwork.**
   - **lnk.to (Linkfire):** these pages only expose 440px art. Search iTunes with `https://itunes.apple.com/search?term=<artist>+<title>&entity=album`, or use `lookup?id=<id>` if the page links to music.apple.com. In `artworkUrl100`, swap `100x100bb` for `1500x1500bb` to get the full cover. The `releaseDate` there tells you whether it's out yet.
   - **ffm.to:** the `og:image` is a cropped banner, so don't use it. Grep the page for the untransformed cloudinary URL (`…/f_jpg/https%3A%2F%2Fimagestore.ffm.to…`, with no `w_`/`h_` transform); that's the square cover.
   - Fetch pages with a browser User-Agent.

3. **Save the grid image:** `images/release-drx030.jpg`, 640px square at JPEG quality 82. This is the real, untouched cover.

4. **Move the spotlight to the new release.** The new release always takes the spotlight. The previous one just stays in the grid, so there's nothing to move.

   ```js
   const FEATURED = {
     catalog: 'DRX030',
     image: 'images/release-drx030-lg.jpg',
     out: '2026-12-04',   // release day; the label reads "Out Dec 4" before it, then "Out Now"
     until: '2027-01-01', // about four weeks after release; the hero goes back to the logo after this
     label: 'Out Now',
     holdSeconds: 30,
   };
   ```

5. **Make the spotlight image:** `images/release-drx030-lg.jpg`, 1200px. Every cover is a rotary phone on a backdrop glowing in one colour, and under the spotlight that glow shows as an ugly halo. Drain it:

   ```sh
   pip install pillow numpy scipy
   python3 tools/clean-backdrop.py cover-1500.jpg images/release-drx030-lg.jpg --glow r --preview /tmp/compare.jpg
   ```

   `--glow` is the backdrop's dominant channel: `r` for red or orange, `g` for green, `b` for blue. Then look at the preview image. The left half is the original and the right half is the result, both brightened 2.5x. The backdrop must go to black with no coloured rim around the phone, and nothing on the phone may be eaten. If it isn't right, adjust the thresholds in the script rather than shipping it.

## Style rules

These come from Youssef and are firm:

- The site stays black. Never white, never a Yeezy-style restyle.
- No banners, popups or marketing copy. Josh and Youssef find them tacky.
- The spotlight artwork sits still, with no shake or ring animation. It's an opening moment only. It ends on scroll, on click, or after `holdSeconds`, and then the logo is back.
- Never commit reference or mood images people send. Only actual site assets go in `images/`.
- Credit names exactly as the flyer or release spells them.

## Commits

One change per commit. The message reads like a changelog line, for example `DRX029: Sublee - Groove Control takes the spotlight` or `Dec 3: Alci · Anthea · Priku at Sable for Art Basel`. `tools/` and this file are for whoever maintains the site. The site doesn't load them.
