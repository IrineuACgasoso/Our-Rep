import { TRAVEL_CATS } from '../../context/AppContext';

export function getCatItems(dest, catKey) {
  const cats = dest?.cats || {};
  const cat = cats[catKey] || Object.values(cats).find((c) => c.label === TRAVEL_CATS.find((t) => t.key === catKey)?.label);
  return cat?.items || {};
}

export function resolveCatPath(dest, catKey) {
  if (dest?.cats?.[catKey]) return catKey;
  const label = TRAVEL_CATS.find((c) => c.key === catKey)?.label;
  const found = Object.entries(dest?.cats || {}).find(([, c]) => c.label === label);
  return found ? found[0] : catKey;
}

export function itemDbPath(dest, travelKey, catKey, itemKey) {
  const pathKey = resolveCatPath(dest, catKey);
  return `travels/${travelKey}/cats/${pathKey}/items/${itemKey}`;
}