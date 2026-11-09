# Organization logo files

Put your organization's logo files in this folder, then point
`frontend/src/config/brand.ts` at them:

| File (suggested)   | `brand.ts` field | Used for                                   |
|--------------------|------------------|--------------------------------------------|
| `org-logo.png`     | `logo`           | Sidebar, sign-in page, About page (wide)   |
| `org-logo-dark.png`| `logoDark`       | Optional: the same logo for dark mode      |
| `org-icon.png`     | `icon`           | Browser tab, collapsed sidebar, app icon   |

Paths in `brand.ts` start with `/brand/`, for example `logo: '/brand/org-logo.png'`.

PNG or SVG on a transparent background works best. The icon should be
square (at least 512 x 512 px). With no icon set, a tile with your
initials in `primaryColor` is used instead.

The other files in this folder (`ddc-*`, `artem-boiko-avatar.png`) belong
to the upstream project and are only shown when
`showUpstreamCommunity` is turned on.
