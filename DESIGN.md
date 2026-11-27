---
name: SNCMT School & College Management
description: The school office's register, kept on screen. Calm, trustworthy and warm: white paper, the school's own accent, and Merit Gold marking the place.
colors:
  register-navy: "oklch(0.285 0.11 263)"
  register-navy-ink: "oklch(0.305 0.1 258)"
  navy-wash: "oklch(0.955 0.018 258)"
  merit-gold: "oklch(0.82 0.14 82)"
  merit-gold-deep: "oklch(0.7 0.14 78)"
  signal-blue: "oklch(0.5 0.17 262)"
  signal-blue-wash: "oklch(0.952 0.022 262)"
  accent-band: "oklch(0.5 0.17 262)"
  accent-band-text: "oklch(0.985 0 0)"
  accent-ink: "oklch(0.305 0.1 258)"
  menu-ink: "oklch(0.32 0.04 262)"
  menu-hairline: "oklch(0.91 0.01 255)"
  paper: "oklch(1 0 0)"
  canvas: "oklch(0.972 0.006 260)"
  ink: "oklch(0.145 0 0)"
  quiet-ink: "oklch(0.556 0 0)"
  hairline: "oklch(0.922 0 0)"
  muted-fill: "oklch(0.97 0 0)"
  danger: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "\"Times New Roman\", Tinos, \"Anek Bangla\", Times, serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "\"Times New Roman\", Tinos, \"Anek Bangla\", Times, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "\"Times New Roman\", Tinos, \"Anek Bangla\", Times, serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "\"Times New Roman\", Tinos, \"Anek Bangla\", Times, serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "\"Times New Roman\", Tinos, \"Anek Bangla\", Times, serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.08em"
  mono:
    fontFamily: "\"Geist Mono\", ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
  site-name:
    fontFamily: "\"Times New Roman\", Tinos, \"Anek Bangla\", Times, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "5px"
  xl: "6px"
  2xl: "8px"
  3xl: "10px"
  4xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.register-navy-ink}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  table-head:
    backgroundColor: "{colors.muted-fill}"
    textColor: "{colors.quiet-ink}"
    typography: "{typography.label}"
    height: "40px"
  badge-count:
    backgroundColor: "{colors.navy-wash}"
    textColor: "{colors.register-navy-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  sidebar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.menu-ink}"
    width: "256px"
  sidebar-item-active:
    backgroundColor: "{colors.accent-band}"
    textColor: "{colors.accent-band-text}"
    rounded: "5px 10px 10px 5px"
    height: "40px"
  site-topbar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.accent-ink}"
    height: "40px"
  site-header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.accent-ink}"
    height: "88px"
  site-nav-active:
    backgroundColor: "{colors.accent-band}"
    textColor: "{colors.accent-band-text}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  site-footer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.accent-ink}"
  principal-card:
    backgroundColor: "{colors.signal-blue-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "28px"
  fact-cell:
    backgroundColor: "{colors.signal-blue-wash}"
    textColor: "{colors.accent-ink}"
    padding: "24px"
---

# Design System: SNCMT School & College Management

## Overview

**Creative North Star: "The School Register"**

SNCMT looks like the register book that sits on every school office desk: ruled, orderly, kept in ink, with a coloured index tab on the page you are working on and a gold mark beside it. Office staff spend whole days in it, so it stays calm and readable rather than exciting. Its authority comes from order: rows that line up, numbers that sit in columns, labels that never move. Its warmth comes from the serif type, the gold, and plain friendly words, not from decoration.

The system is flat. Surfaces are white paper on a cool grey desk, separated by hairlines and light grey bands rather than shadows. Colour is rare and always means something: the school's own **accent** carries its identity (the current page, the main action, headings on its homepage), Merit Gold marks where you are, and status colours say present, absent, paid or suspended. Everything else is ink on paper.

Density follows the work. Tables and forms are compact enough to show a full class on one screen, but every row has room to breathe and every control reads as clickable for staff who are not technical. Bangla and English share every screen, so layouts allow for longer Bangla words and Bangla digits.

Each school's public homepage is the same register turned outward: the school's prospectus. It opens on the school's own photographs at the full size of the screen, then its about section with the principal's message, its teachers, and its newest notices as cards, then chapters on ruled paper (admission, gallery, contact). Real photographs supply the warmth; the rest is order, serif type and hairlines, in the school's own accent.

**Key Characteristics:**
- White menu, white paper, cool grey desk; the current page is an index tab in the school's accent.
- Every school colour on the homepage comes from the school's accent; gold only marks the place.
- Flat at rest: hairlines and grey bands instead of shadows.
- Serif type everywhere, sized a step larger in Bangla than in English.
- Small, consistent corners (4px for controls, 8px for cards); pills for the homepage menu and buttons.
- Colour only where it carries meaning.

## Colors

A disciplined palette: the school's one accent, one gold marker, neutral paper and ink, and the status colours. A school sets two colours in Settings → Appearance: its **accent** and its **sidebar**.

### The school's accent
A school picks one of ten accents: Navy (the default), Royal blue, Indigo, Violet, Maroon, Teal, Deep teal (#0a4a63, the homepage mockup's), Slate, Golden or Cream (`lib/theme/accents.ts`, `DEFAULT_ACCENT`; the server keeps the same list). No choice is saved as empty and means Navy; every other accent, Royal blue included, is saved by name. Royal blue stays the platform's own accent (the platform admin and globals.css). Each accent gives a set of shades, and everything that should look like "the school's colour" uses them:
- **Accent** (`--brand`; Signal Blue by default): the short bar above each page title, the open tab's underline, links, small highlights.
- **Accent Wash** (`--brand-soft`; Signal Blue Wash by default): soft tinted fills: the principal's card, the facts row, the hero while photos load.
- **Accent Ink** (`--navy`, `--primary`; Register Navy Ink by default): the accent's deep shade, for primary buttons, headings and figures in the accent, and white text on it. In dark mode it turns into a light tint.
- **Accent Band** (`--brand-band` and its text colour): the accent as a fill, the same in both modes: the dashboard menu's current page, the homepage menu's current item. Golden and Cream bands carry dark navy text; the rest white.
- **Accent Ink, fixed** (`--brand-ink`): the accent's deep shade, the same in both modes, for parts that stay white or dark whatever the theme: the dashboard's welcome banner and the phone's bottom bar, the homepage header's text and the footer's round marks.

Every accent is checked for WCAG AA: its text on white, white on its ink, and its band's text on the band.

### The sidebar colour
- **White** (the default) or one of the dark colours: Navy, Indigo, Deep teal, Ocean teal, Emerald, Deep purple or Charcoal.
- It colours only the dashboard's menu. The welcome banner, the phone's bottom bar and the public homepage use the accent (Accent Ink, fixed) instead.
- **Register Navy** (oklch(0.285 0.11 263)) stays the platform admin's menu colour.

### Merit Gold
- **Merit Gold** (oklch(0.82 0.14 82)): marks on the platform admin's navy menu.
- **Merit Gold Deep** (oklch(0.7 0.14 78)): the same gold on white: the top bar of the picked status card on the Students page, and other "you are here" marks in the dashboard. The homepage uses its own gold (below).
- Gold never follows the accent: it is the one fixed colour that says "you are here".

### The homepage's markers
The public homepage uses two fixed marker colours of its own (`--color-site-gold`, `--color-site-label`), whatever the school's accent:
- **Homepage Gold** (#f9a90c): the short line before the hero's line, the principal's quote mark, the line under the menu's current item, the teachers row's current dot, the application form's preview note, and the stroke along the footer's wave.
- **Label Orange** (#c4510f): the small label above every section heading ("Who we are", "Notice board", "Campus", "Join us", "Campus life", "Get in touch"), bold 12 to 13px, in spaced capitals in English (Bangla keeps its own spacing).

### Neutral
- **Paper** (oklch(1 0 0)): cards, tables, inputs, the top bar, the white menu.
- **Canvas** (oklch(0.972 0.006 260)): the desk behind the cards, with a faint glow of the accent in the top corner.
- **Ink** (oklch(0.145 0 0)): all body text.
- **Menu Ink** (oklch(0.32 0.04 262)): text and icons in the white menu.
- **Quiet Ink** (oklch(0.556 0 0)): secondary text: admission numbers, hints, column headings, counts.
- **Hairline** (oklch(0.922 0 0)): every border and divider, usually at 60 to 70% strength; **Menu Hairline** (oklch(0.91 0.01 255)) in the white menu.
- **Muted Fill** (oklch(0.97 0 0)): table heading bands, hover rows, chip tracks.
- **Danger** (oklch(0.577 0.245 27.325)): destructive actions, errors, the required-field star.

Status pills use their own soft pairs: emerald for active and present, red for suspended and absent, amber for late, grey for inactive, navy for graduated. The word always carries the meaning; the colour only helps. These never change with the accent.

### Named Rules
**The School's Own Colour Rule.** On a school's homepage and in its dashboard, anything that is "the school's colour" uses the accent's shades, never a fixed blue or navy, so changing the accent in Settings changes all of it. The homepage uses nothing from the sidebar colour.

**The Gold Marks the Place Rule.** Merit Gold appears only to say "you are here". It stays gold whatever the accent. Never use it for buttons or body text.

**The One Accent Rule.** One accent per screen. A second decorative colour is never added.

**The Meaning-Only Colour Rule.** Any colour beyond the accent, gold and neutrals must carry a status. If it doesn't mean something, it is grey.

## Typography

**Display Font:** Times New Roman (with Tinos, then Times, serif)
**Body Font:** Times New Roman for English; Anek Bangla for Bangla letters, drawn at 88% of its natural size so it sits evenly beside the English
**Label/Mono Font:** Geist Mono, only for codes such as the school's subdomain
**School homepage (and its application form):** English in Plus Jakarta Sans for text and Merriweather for headings, the school's name and the footer line (its italic), as in the agreed mockup (`components/school/site/SiteFonts.tsx`, only on those pages, windows they open included). Bangla letters still come from Anek Bangla.

**Character:** a classic serif that reads like a printed register or a certificate, paired with a clean modern Bangla face. Formal without being stiff.

### Hierarchy
- **Display** (700, 1.75rem / 2rem from 640px in Bangla; 1.625rem / 1.75rem in English; line-height 1.2; -0.025em): one per page, the page title, with a 28px accent bar above it.
- **Headline** (600, 1.125rem, 1.3): section and card headings, such as "Class 7, section A".
- **Title** (600, 0.9375rem, 1.4): button labels, panel titles, student names in tables.
- **Body** (400, 0.9375rem in English, 1rem in Bangla, 1.43): table cells, form text, descriptions. Keep prose under 75 characters a line.
- **Label** (600, 0.8125rem, 0.08em, uppercase in shared tables): column headings and small field labels. The Students list uses the same size in sentence case.
- **Site Name** (700, 17px on phones, 22px from 640px, 24px from 1024px; 1.15): the school's name in the homepage header, over at most two lines, in Accent Ink.

The whole scale is one step larger in Bangla than in English (the English scale runs 13, 15, 16, 18, 20, 24 and 30px).

### Named Rules
**The Bangla Is Not a Translation Rule.** Every text size, line length and label must work in Bangla first; English is set a step smaller to match its visual weight.

**The Numbers in Columns Rule.** Rolls, counts, amounts and dates use tabular figures so they line up down a column.

**The Whole Name Rule.** A school's name is never cut short with "…" where it is the subject (the dashboard's welcome, the homepage header): it wraps, balanced.

## Layout

A fixed white menu (256px, folding to 80px of icons) on the left; a white top bar (72px) across the content; the content area on the grey canvas with 6px padding on phones and 8px from 768px up, so pages use the full width. A small monospace trail (11px, "Home / People / Students") sits above each page; a page with a header panel (Page Hero) carries it there instead. Pages open with the title row (title and count on the left, actions on the right, aligned to the bottom), then one main card holding the work.

Spacing follows a 4px grid; the common steps are 8px between related controls, 12px between toolbar items, 20px of padding inside cards and 24px between page sections. Tables keep their first and last columns aligned with the card's 20px padding.

On phones the menu becomes a drawer opened from the top bar, a bottom bar carries the main pages, and sideways lists (the Students page's status cards, status tabs) scroll instead of wrapping.

### The public homepage
- **Header** (two parts):
  - a 40px white utility bar (13px text, icons and light dividers all in Accent Ink, fixed) that scrolls away with the page: phone, email and address on the left parted by light "|" bars (the email from 640px, the address from 768px, shortened to its last two parts); "Log in" (the school's login, after a sign-in icon; "Dashboard" with a dashboard icon once logged in) and the language on the right.
  - a sticky 80px white bar under it (95% white with a blur, a hairline and a soft shadow below): the school's 56px round logo and its name over two lines (split at the space nearest the middle when it has three words or more) in bold Accent Ink, fixed, and the menu on the right from 1024px; below 1024px a menu button opens a panel under the bar.
- **Hero:** on white warming to the pale teal at the right, a soft wave along the bottom; the words on the left, the school's photos as framed cards on the right (0.92 : 1 from 1024px, 80px apart), the next card peeking in past the column to the window's edge.
- **Order:** About (48px, 64px from 1024px) with its facts as a strip under it, Teachers, Notices, Facilities, Admission and Gallery, then the footer (the menu's Contact). The application form is its own page (`/apply`) with the same header and footer.
- **Column:** everything sits in a centred 1280px column with 16px gutters (24px from 640px, 32px from 1024px). Every band is white; the pale tint (`--color-site-ice`, 5% of Accent Ink, fixed, with its edge `--color-site-line` at 16%) appears only inside boxes. Text is slate (#475569 for body, #64748b for small print). Sections land 80px under the top when the menu jumps to them.
- **Sections:** each opens with its Label Orange label (11px bold) and its heading (20px, 24px from 640px, bold Accent Ink, fixed) on the left, an action across from it ("View all notices", arrows), then the content 28px below. 48px of padding above and below (Facilities 40px); no hairlines between them. The footer is the Contact part.

### Named Rules
**The Filled Chapters Rule.** The homepage shows only the chapters the school has filled in (notices and contact always), in page order, and none of them is numbered. The menu and the footer follow the same list.

## Elevation & Depth

Flat. Nothing casts a shadow at rest: cards, tables, panels and the top bar are separated by 1px hairlines (at 60 to 70% strength) and by light grey bands. Depth comes from layering paper on the canvas, not from light. Things that genuinely float above the page (menus, dropdowns, dialogs, toasts) carry a soft shadow, and so do a few things that physically sit on top of the page:
- the menu's index tab, where it lies over the page;
- the homepage's round logo, and its About photograph.

### Named Rules
**The Hairline, Not Shadow Rule.** Separate with a 1px hairline or a grey band. If you reach for a drop shadow on something that does not float or lie on top, use a border instead.

**The No Lift Rule.** Cards and buttons do not rise, glow or scale on hover. Hover changes a background or a border, nothing more.

**The Framed Photo Rule.** The hero's photographs sit in white-framed cards beside the words, never under them: no text on a photo, no shade, no blur.

## Shapes

Small, consistent corners: 4px on buttons, inputs and selects, 5px on menu rows (the index tab rounds its outer end to 10px), 8px on cards, panels, the homepage's About photograph and the principal's card, and full circles for avatars, the homepage logo, status pills, count badges and the homepage's menu pill and buttons. Borders are 1px hairlines; the only thicker lines are the 2px and 3px tab underlines and the 3px gold and accent marker bars.

The school homepage follows the mockup's own corners instead, written in pixels (the app's scale above runs smaller): 6px on the menu's items, 12px on cards (notices, gallery, teachers, the admission sheet), 16px on the large boxes (the About photo, the principal's card, the facts strip) and on the facility tiles.

## Components

Plain and dependable: clear labels, a solid accent button for the main action, thin outlines for the rest; nothing moves or glows.

### Buttons
- **Shape:** gently squared (4px radius), 36px tall. On the homepage, pills (44px tall).
- **Primary:** Accent Ink with white text, semibold, 16px side padding. One per view: "Add student", "Save changes".
- **Hover / Focus:** a slightly lighter shade on hover; a 3px soft ring on keyboard focus. No movement.
- **Outline / Ghost:** white with a hairline border for secondary actions (Export); ghost (no border) for row actions and "Clear filters".

### Chips
- **Filter selects:** white boxes with the filter's name inside in Quiet Ink ("Year 2026", "Gender All"); a set filter gets a darker border and a light grey fill.
- **Section buttons:** small outlined boxes (All, A, B); the picked one turns solid Accent Ink with white text.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Paper on the Canvas.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px hairline at 60 to 70%.
- **Internal Padding:** 20px; sections inside a card are divided by hairlines, not by nested cards.

### Inputs / Fields
- **Style:** white, hairline border, 4px radius, 36px tall; search boxes carry a magnifier on the left.
- **Focus:** the border darkens; no glow ring on text fields.
- **Error / Disabled:** Danger border with the message under the field; disabled fields fade to half strength. Required fields carry a Danger star after the label.

### Navigation
- **Top bar:** white with a hairline below, holding messages, language, theme and the account menu.
- **Tabs:** a page's own parts sit in a white strip of their own under its header panel (16px corners, hairline border): icon and label per tab, the open one Accent Ink and bold with a 3px underline on the strip's bottom edge. Parts set up once a year go in a menu at the strip's right end (Exams: "Setup", each item with a one-line hint; the button shows the open part's name). The tabs scroll inside the strip and never push past the screen's edge; the open tab scrolls into view. Tabs inside a part stay a row of labels on a hairline with a 2px accent underline.
- **Mobile:** the menu becomes a drawer; a bottom bar in Accent Ink, fixed, carries the main pages, the current one in Merit Gold.
- **Platform admin menu:** navy, white text, the current page on a 10% white tile with a 3px Merit Gold bar.

### The School Menu (signature: the index tab)
The school dashboard's menu reads like the index of the school's register binder.
- **Paper and edge:** white by default (a quiet dark grey in dark mode), or the school's dark sidebar colour with white text. Its paper stops 8px short of its edge, behind one hairline. The strip beyond shows the page's own colours: the top bar's white, then the canvas.
- **The tab:** the current page (or the current page inside a group) is filled with the Accent Band in its own text colour. It reaches out of the paper into that strip like an index tab, with a soft shadow where it lies on the page and a faint crease where it leaves the paper.
- **Header:** the logo with "Dashboard" and "Session 2026" beside it, as tall as the top bar, over a short light hairline.
- **Clusters:** thin hairline rules separate the clusters of pages, as an index does, instead of an all-caps label.
- **Groups:** a group (Academics, Administration) opens into its pages on a thin line, one group at a time.
- **Foot:** a help line, "Need help? WhatsApp us: 01626-567819", which opens a WhatsApp chat.
- **Scrolling and folding:** there is no visible scrollbar (it would cross the tab). The rows scroll with the wheel and keyboard, and the last rows fade out to show there is more. There is no rail; the menu folds with its button. In the phone drawer, which has no page beside it, the tab is a plain filled box.

### Tables
- **Heading band:** Muted Fill behind 13px semibold Quiet Ink headings (uppercase with 0.08em tracking in shared tables).
- **Rows:** hairline separators, a light grey on hover, no striping; first and last cells align with the card padding.
- **Status:** a soft pill with a dot and the word.

### Page Title (signature)
Every page opens with its title in Display weight, a 28px by 3px accent bar above it, a count badge beside it when the page lists things, and its actions aligned to the bottom on the right.

### Page Hero
Every dashboard page sits 14px from the top bar, the menu and the window on every side (6px on phones); the current menu tab reaches 8px into that gap. A page's header as its own panel in Accent Ink, fixed, with an 8px corner, 8px above the page's sheet and never overlapping it: the trail in white (the current step bold), the title (1.75rem, bold) and a line under it in 75% white. A page's main actions sit at its right end, aligned to the bottom: secondary ones outlined in 35% white, the primary solid white with Accent Ink words; on phones they share a full-width row under the title. Used by every school dashboard page; the student and teacher profiles colour their own header row (photo, name, status) the same way. Below it, a list page's sheet (toolbar, table, pages) reaches the bottom of the window, with the pagination at its foot.

### Form Pages (signature: register bands)
A long form is one white sheet as wide as the page and at least as tall as the window, divided by hairlines into bands. Each band has its name (bold, Accent Ink) and a one-line hint in Quiet Ink in a 220px column on the left, with room under them for a photo picker; its fields sit on the right, four across from 1280px, three from 1024px, two from 640px, one on phones, 20px apart and aligned to the top of their row. Bands have 28px of padding (16px on phones). The actions (Cancel, then the primary in Accent Ink with its icon) stay pinned at the bottom of the window on a frosted strip, with "Fields marked with a star are required" on the left; on phones they sit just above the bottom bar, full width. Admitting a student returns to the student list; saving an edit returns to the student.

### Marks Register (Exams → Marks)
One sheet: the pickers (Exam, Class, Section, Subject) and the way of entering (by subject, whole section, progress) on a Muted Fill strip; then the subject (its name in Accent Ink, pills for full and pass marks and each part's, a progress bar with absentees in red); then a row per student: roll, name (up to 240px, wrapping to two lines), the mark box right after it, the Absent pill, and Pass (emerald) or Fail (red) as the result will count it. Two columns of students from 1280px (1536px for a subject in parts). Mark boxes are 84×44px (62px per part) with a 1.5px edge and 20px bold figures: empty white with a dash, filled in the Accent Wash with Accent Ink figures, absent in red with অ, a mistake with a red edge and the reason under the name. The row being typed in takes the Accent Wash with a 3px Accent Ink bar on its left. Enter moves to the next box. The save bar ("N new marks", Save) stays at the bottom of the window.

### Result Card Designer (Exams → Result card)
One sheet: the settings down the left (340px; 320px from 1024px), the preview on a grey desk on the right. The save bar (Save design, Undo, "N changes") stays at the top of the settings; the groups (Look, Header and student, Subject table, Below the table, Signatures and footer) are bands with a small icon, short switches two to a row. Layout buttons carry a tiny drawing of the layout in the chosen colour. The preview's bar (exam or final result; Fit to screen or Actual size; "Size 76%") and the card stay in view while the settings scroll; the card is drawn at its printed width (190mm) and zoomed to fit the preview's width and the window's height, so it never runs off the screen. Below 1024px the preview comes first. On the card itself (Classic), the school's name, address and exam line are centred on the card with the logo in the left column; the title band has no letter-spacing.

### Dashboard Welcome
The dashboard's header panel (it takes the Page Hero's place, so no trail shows above it), with the number cards and panels under it 8px apart. A banner in the school's accent, in its fixed deep shade (Accent Ink, fixed): the date and year chip, the greeting with the school's full name (wrapping, never cut), and the quick actions (Collect fee, Take attendance, Add student, New notice) as an even two-column grid of pills, 12px apart, beside it. On phones the actions sit under the greeting, and a long label wraps inside its pill.

### Status Cards (Students)
The Students register opens with a card per status: All, Active, Suspended, Inactive, Graduated. Each is paper with a hairline edge and 8px corners: a 32px icon box and the status name, the count in large tabular figures, and a 4px bar of its share of all the students with the percent. Icon and bar take the status pill's colours (emerald, red, grey, Accent Ink; All in the accent). The picked card carries a 3px Merit Gold Deep bar along its top and a darker edge; hover only darkens the edge. Five across from 1024px, a sideways-scrolling row below. Under them one card holds the toolbar on a Muted Fill band (search; Class, grouped School and College, and its Section; Year, Group, New or old, Gender, Religion; Clear filters; the order, "Sort", at the right end: the usual order, Newest, Oldest) and the table.

### Homepage Header
- **Utility bar:** see Layout. Every word in it is Accent Ink; links underline on hover. The language button is a globe, the language's name and a small arrow, also in Accent Ink; on phones the globe alone (with a larger tap area).
- **Main bar:** the logo is a plain 56px circle. The name sits beside it over two lines, 16 / 14px (18 / 16px from 640px).
- **Menu:** 14px semibold links in Accent Ink, fixed, in boxes with 6px corners (10px side padding up to 1280px, 14px from there), each followed by a small down arrow; hover turns the text Homepage Gold. The current one is filled with Accent Ink with white text and a small shadow. About opens a menu with About and Teachers (when the school shows teachers).
- **Phone menu:** the links as rows with 6px corners, each ending in a small right arrow; the current one filled with Accent Ink, the rest tinted on hover; the way in at the end.

### Homepage Hero (signature)
The school's photos as a row of framed cards on the right (each white with a 6px edge, 16px corners and a soft shadow, the photo inside at 10:7 with 12px corners), sliding one card at a time (0.6s, the standard ease; each shows for 6s). The card in view fills the right column; the next one peeks in past it, out to the window's edge, and the row runs on from the last photo to the first. Round white 44px arrows (40px on phones) with a navy chevron and a soft shadow sit centred on the card's left and right edges and fill with Accent Ink on hover. On the left, on white:
- **The school's line** (Settings → About; none when empty): a 66 by 2px Homepage Gold line, then the line in bold Accent Ink, fixed, 12px in capitals spaced 0.2em, its parts parted by a heavy dot set as text with a plain space either side.
- **The name** as the page's heading over two lines, bold Merriweather, Accent Ink, fixed: 53px with a 1.2 line height from 1024px (42px from 640px, 32px on phones), 12px under the school's line.
- **The tagline** (Settings → About; a default line until it writes one), 19px medium slate (#334155), 24px under the name.
- **Buttons**, 34px under it, 24px apart: "Admission Open 2027" (the year from Settings → Admission; no button when empty), a 48px pill (30px side padding) in Accent Ink, fixed, with white 15px semibold text, an arrow and a soft shadow, opening the application form; and "Explore Our School", a white 48px pill with a 40% Accent Ink outline (44px pills, 14px text below 1024px).
- **Dots:** a 10px dot per photo at the foot of the left column (under the cards on phones), the current one Accent Ink, the rest light slate.
- **Moving:** the row turns by itself, held while pointed at, focused or scrolled away; arrows, dots, the arrow keys and swipes move it. Nothing moves when the visitor asks for less motion. With one photo there are no arrows or dots; with none, the words alone. Without slides the About photo or the first gallery photos stand in.

### Homepage About (signature)
The school's introduction and its principal's message as one compact row of up to three parts of the same height, from 1024px (two columns on tablets, stacked on phones). Every part comes from Settings → About section.
- **Photograph:** filling its column's height (at least 224px), 8px corners, a soft shadow.
- **Words:** the Label Orange label "Who we are", the heading "About the school" in Accent Ink, the first paragraph cut to four lines, then a "Learn more →" pill in Accent Ink. It opens a window with the whole story and the principal's whole message, so the row never grows.
- **Principal's card:** on the pale tint with its edge (16px corners, 24 / 28px padding, a small shadow), with a Homepage Gold quote mark and the heading "Message from the {title}" in Accent Ink. The message, cut to five lines, sits beside a round photo with a white ring, then "— Name" in Accent Ink with the title beside it in Quiet Ink. The title defaults to "Principal" / "অধ্যক্ষ"; the card shows only when the message isn't empty.
- **Stats strip:** under the About row (shown on every school's homepage), a rounded box in a light deep teal (#f1f7fa, the mockup's ice; edge and dividers #d6e9f0; the same whatever the accent), 28px tall in padding, four across from 1024px (ruled between them) and two on phones. Each card is a large icon in Accent Ink beside a bold figure over its label: the school's active students and its working teachers, counted by the app (a count of none drops out), then "A+ Quality Education" and "100% Commitment", the same for every school. Schools no longer type facts in Settings.
- **Missing parts:** any part the school hasn't filled in drops out, and the columns close up.

### Homepage Teachers
Right after About, on paper with a hairline above. The teachers the school picked in Settings ("Teachers on the homepage"), in its order; with none picked there is no section and no menu item.
- **Heading row:** the Label Orange label "Our faculty" over "Our teachers" in Accent Ink; across from it two 36px round outline arrows in Accent Ink, faded at the ends, shown only when the cards don't all fit.
- **Cards:** five across from 1024px, four from 768px, three from 640px, two on phones, 16px apart, sliding a page at a time (swipe on phones, snap to each card). Each is the Accent Wash with an 8px corner: a round photo (96px, 112px from 640px) with a white ring and soft shadow (a drawn silhouette on an accent tint without one), the name bold in Accent Ink, the designation in Quiet Ink, both two lines at most.
- **Dots:** one per page under the row; the current one a 24px Homepage Gold pill, the rest 8px grey dots.

### Homepage Sections
- **Facilities:** after Notices, on paper: the label "Campus" and "Our facilities", then the facilities the school ticked in Settings → Facilities (from a fixed list of twelve, each with its own icon), as even tiles in the stats strip's light deep teal (#f1f7fa, edge #d6e9f0), 16px corners, at least 128px tall (28px above and below): the icon in Accent Ink over the name in bold Accent Ink. Six across from 1024px, three from 640px, two on phones; none ticked, no section and no menu item.
- **Admission sheet:** one paper card divided by hairlines into parts, each titled in its own margin. Requirements are numbered, dates are label/value rows, and fees follow a printed fee schedule: label, dotted leader, amount ("TK 2,000" in English, "৳২,০০০" in Bangla).
- **Notices:** on the grey desk. The label "Notice board" over the heading in Accent Ink, with "View all notices →" across from it when there are more than three. Below, the newest three as white cards with an 8px corner and a hairline border, three across on desktop, two from 768px, stacked on phones. Each card holds the date in a box of the Accent Wash (the day large and bold in Accent Ink, the month and year under it) with a short hairline beside it (56px, centred on the box), then the title in Accent Ink (two lines at most), the start of the text in Quiet Ink (two lines), then "View" with an eye icon in Accent Ink with pinned and file marks, and the category's icon in the top corner. The whole card opens the notice in a window. "View all notices" opens a window listing every notice as dated rows, with "Show more" as an outline button in the accent; a notice opens on top of the list. Pinned notices come first.
- **Gallery:** photographs in even 4:3 frames (1px hairline, 4px inset, 8px corners) with captions beneath them. The first six show, then "Show all".
- **Application form (`/apply`):** a preview for now: nothing is sent. The label "Admission 2027", the heading and a line on what to fill in; a note on a Homepage Gold tint saying it is a preview; then one white sheet split by hairlines into bands (Student; Parents and guardian), each band's name and hint in a 220px column from 1024px and its fields two across. Required fields carry a Danger star; problems show under their field on submit, the first one focused. Sending shows a confirmation in place of the form.

### Homepage Footer
The menu's Contact. On white with a hairline above, 56px of padding on top, in four columns from 1024px, each as wide as its content (the school at most 352px) with the space left over shared out evenly, so the white between any two columns is the same (at least 48px); two from 640px, stacked on phones. Both lists run in 20px rows 10px apart, each after a 14px icon in Accent Ink, so the quick links and the contacts line up across.
- **School:** the 64px round logo beside the name over two lines in bold Accent Ink, then its footer line (or the default one) in italic Accent Ink at 80%.
- **Quick links:** a 14px bold heading, then the homepage's parts and the login (or "Dashboard"), 12px medium slate, each after a small chevron in Accent Ink.
- **Contact us:** phone, email, address (opening Google Maps) and website, 12px medium slate, each after a small icon in Accent Ink.
- **Follow us:** the school's Facebook, YouTube and Instagram pages as 32px round marks in Accent Ink, gold on hover; only those it filled in.
- **Bottom:** under a hairline, the 11px copyright line over a wave in the pale tint's edge colour with a 5px Homepage Gold stroke, at 60%.

## The main site (sncmt.com)

The platform's own marketing page shares the type and the gold but has its own look, "the school exercise book":
- **Margin line:** a margin line runs down the page with small italic notes in the margin.
  - the hero on pale sky-blue ruled paper, beside a drawing of a school dashboard whose attendance bars rise once. From 1024px wide the drawing sits beside the words and the hero fills the browser window under the header, its content centred. On a short window (up to 840px tall, then 700px) the headline drops to 3.5rem, then 3rem, and the gaps tighten. The drawing zooms itself (down to 50%) to fit both its column and the window, and rises up to 72px into the empty paper beside the headline (24px clear of its words) to gain room, so the whole hero shows at once on any laptop browser;
  - the hero on pale sky-blue ruled paper, beside a drawing of a school dashboard whose attendance bars rise once;
  - the features on a deep green chalkboard, grouped by area with chalk-yellow headings;
  - the packages on white, the popular one in solid navy;
  - contact on navy, with the WhatsApp number highlighted;
  - the footer on sky blue.
- **No gradients:** no gradients anywhere on this page.
- **Fixed buttons:** a WhatsApp button and a back-to-top button sit at the bottom right.
- **Logo:** the SNCMT logo (a graduate rising from an open book in a navy ring) marks the header, the footer and the browser tab.

## Do's and Don'ts

### Do:
- **Do** take every school colour from the accent's shades, so one change in Settings recolours the dashboard tab and welcome banner, the homepage header, menu, About section and footer together.
- **Do** keep Merit Gold for the marks that say "you are here", gold whatever the accent.
- **Do** separate surfaces with 1px hairlines at 60 to 70% and light grey bands, never shadows at rest.
- **Do** keep one solid accent button per view for the main action; everything else is outlined or ghost.
- **Do** use tabular figures for rolls, counts, amounts and dates.
- **Do** size type for Bangla first, with English one step smaller.
- **Do** show a school's name whole, wrapping where it must.
- **Do** keep corners small and consistent: 4px controls, 8px cards, full circles only for avatars, pills, badges and the homepage's menu and buttons.
- **Do** open every school's homepage on its own photographs at full size, and give the slideshow a pause button.
- **Do** lay homepage content out as chapters with their titles in the margin, ruled with hairlines rather than boxed in cards (About excepted).

### Don't:
- **Don't** use a fixed blue, navy or gold where the school's colour belongs, and don't use the sidebar colour on the homepage.
- **Don't** add drop shadows, hover lifts, glows or scaling to cards and buttons.
- **Don't** use gradients, gradient text or decorative colour washes (the hero's soft white-to-teal ground is the one gradient), and don't cut a school's photograph down to a fragment.
- **Don't** put words on a hero photograph, or a dark shade or blur over it: the photos are framed cards beside the words.
- **Don't** decorate the homepage with glow blobs, dot patterns, tilted colour blocks or pinging badges, and don't put a small label (a kicker) above a heading.
- **Don't** use a second accent colour or any hue that does not carry a status.
- **Don't** show a visible scrollbar or a rail across the school menu's tab.
