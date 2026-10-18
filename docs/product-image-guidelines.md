# Product Image Guidelines

## Recommended approach

Use one square image per product, stored and served by the application. Do not depend on remote image hotlinks for production.

The preferred image order is:

1. Original photos taken by the business of its actual produce.
2. Licensed stock photos downloaded from a permitted provider.
3. A consistent, licensed generated illustration set when photography is not available.

For the current prototype, Unsplash image links are used only as placeholder content.

## Sources

- Unsplash is suitable for prototypes and commercial use under its published license. Keep a record of the image URL and photographer even though attribution is not required.
- Pexels is another suitable stock source. Its published license allows commercial use and modification, subject to its restrictions.
- Original business photography is the best production choice because it accurately represents the item the shop sells.

Before release, check the license of every selected image and avoid logos, packaging, identifiable people, or images that imply third-party endorsement.

## Asset standard

- Aspect ratio: 1:1 square
- Master size: 1024 by 1024 pixels
- App delivery size: 512 by 512 pixels
- Format: WebP, with JPEG fallback only when required
- Target weight: under 100 KB after compression
- Composition: one recognisable fruit or vegetable, clean pale background, leave margin around the subject
- Naming: `banana-robusta.webp`, `tomato-hybrid.webp`, `green-chilli.webp`

Store final files in:

```text
apps/mobile/assets/products/
```

Keep a small source register outside the application bundle with product ID, original URL, photographer or provider, license URL, downloaded date, and approver.

## Mobile implementation

The product image should be mapped by stable product ID or PLU, not display name. It must have a meaningful accessibility label and a neutral placeholder when the image is unavailable.

For a production build, host product images in Supabase Storage or a CDN and store the signed or public image URL in the product record. Cache images on the mobile device and retain a small local placeholder for temporary connection failures.
