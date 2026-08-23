// LA MARQUE DE GLOBÉNOSTRA — le fichier du partenaire, pas un dessin de nous.
//
// ⚠️ UN BITMAP, ET C'EST VOULU. Les deux autres marques du dépôt sont des SVG
// écrits à la main (`PlacetMark` dessine la nôtre, `SlackMark` reproduit le
// trèfle officiel chemin par chemin), mais on ne redessine PAS la marque d'un
// partenaire : une approximation tracée à la main est une contrefaçon
// approximative de son bien. On sert donc le fichier qu'il nous a donné, comme
// `BrandIcon` sert les logos d'assistants dans `public/brands/`.
//
// ⚠️ LE FICHIER EST RECADRÉ SUR LA MARQUE, PAS RETOUCHÉ. L'original portait
// 25 px de vide transparent de chaque côté ; à hauteur égale, la marque serait
// apparue plus petite que la nôtre et décalée dans le lockup. Seul le vide est
// parti (153×102 → 103×94), le dessin n'est pas touché.
//
// ⚠️ ET `size` EST UNE HAUTEUR, comme pour `PlacetMark`. La marque n'est pas
// carrée (rapport 1,096) : lui imposer un carré l'écraserait.
const RAPPORT = 103 / 94;

export default function GlobeNostraMark({ size = 30 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/partenaires/globenostra.png"
      alt=""
      aria-hidden
      width={Math.round(size * RAPPORT)}
      height={size}
      style={{ display: "block", flex: "none" }}
    />
  );
}
