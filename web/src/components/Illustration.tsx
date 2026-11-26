// The Court Trips illustration (brand/first-light): a court above the sea with the ball as the sun.
// It is for the Court Trips story (the home introduction, the newsletter), never for a listing:
// trips and venues show their own photographs. Its background is transparent and its pale details
// take the colour behind it, so put it on the warm paper (`bg-warm`) it was drawn for.
// The file is made by scripts/brand-illustration.mjs; 640px covers every size it is shown at.
// `eager` is for a placement at the top of a page, so it doesn't pop in after the text.
export function Illustration({ className, eager = false }: { className?: string; eager?: boolean }) {
  return (
    // decorative, and a fixed pre-sized file: next/image's photo loader has nothing to add
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/illustration-640.webp" alt="" width={640} height={640} loading={eager ? "eager" : "lazy"} decoding="async" className={className} />
  );
}
