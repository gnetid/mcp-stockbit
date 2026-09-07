// find_endpoints.mjs
async function searchBundle(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    const regex = /["'](\/[a-zA-Z0-9_\-\/]+(?:portfolio|balance|order|broker|trade|watchlist|quote|summary|running)[a-zA-Z0-9_\-\/]*)["']/gi;
    const matches = new Set();
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.add(m[1]);
    }
    return Array.from(matches);
  } catch(e) {
    return [];
  }
}

const bundles = [
  'https://storage.stockbit.com/backpack/1.2.14/static/2750.6640472bbe83aac6.js',
  'https://storage.stockbit.com/backpack/1.2.14/static/3912.dd3910e778a443e4.js',
  'https://storage.stockbit.com/backpack/1.2.14/static/5428.63224d50292a41de.js',
  'https://storage.stockbit.com/backpack/1.2.14/static/3464.c33a0b32d3a25706.js'
];

for (const b of bundles) {
  const found = await searchBundle(b);
  console.log(`\nFound in ${b.split('/').pop()} (${found.length} matches):`);
  found.slice(0, 20).forEach(x => console.log(' ', x));
}
