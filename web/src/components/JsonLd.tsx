// One block of structured data (src/lib/jsonld.ts). "<" is escaped so text from a listing can't
// close the script tag.
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
