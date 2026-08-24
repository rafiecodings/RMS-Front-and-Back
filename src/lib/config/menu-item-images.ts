/**
 * Predefined static menu-item images for the current UAT/demo build.
 *
 * Files live in `restaurant-frontend/public/images/menu-items/` and are
 * referenced by RELATIVE public paths (works on localhost, Vercel, and any
 * presentation laptop). Drop a photo with the matching filename into the
 * folder and it appears automatically; missing files gracefully fall back
 * to the RMS placeholder via <MenuItemImage>.
 *
 * NOTE: no dynamic directory scanning — this list is intentionally static.
 */

export interface MenuItemImageOption {
  label: string;
  path: string;
}

const P = "/images/menu-items";

export const MENU_ITEM_IMAGES: MenuItemImageOption[] = [
  // Appetizers
  { label: "Lumpiang Shanghai", path: `${P}/lumpiang-shanghai.jpg` },
  { label: "Kinilaw na Isda", path: `${P}/kinilaw-na-isda.jpg` },
  { label: "Calamares", path: `${P}/calamares.jpg` },
  { label: "Chicharon Bulaklak", path: `${P}/chicharon-bulaklak.jpg` },
  { label: "Okoy", path: `${P}/okoy.jpg` },
  // Main Course
  { label: "Chicken Adobo", path: `${P}/chicken-adobo.jpg` },
  { label: "Beef Kaldereta", path: `${P}/beef-kaldereta.jpg` },
  { label: "Chicken Tinola", path: `${P}/chicken-tinola.jpg` },
  { label: "Beef Bulalo", path: `${P}/beef-bulalo.jpg` },
  { label: "Chicken Curry", path: `${P}/chicken-curry.jpg` },
  // Rice Meals
  { label: "Garlic Rice", path: `${P}/garlic-rice.jpg` },
  { label: "Java Rice", path: `${P}/java-rice.jpg` },
  { label: "Chicken Inasal w/ Rice", path: `${P}/chicken-inasal-rice.jpg` },
  { label: "Bangsilog", path: `${P}/bangsilog.jpg` },
  { label: "Longsilog", path: `${P}/longsilog.jpg` },
  // Desserts
  { label: "Halo-Halo", path: `${P}/halo-halo.jpg` },
  { label: "Leche Flan", path: `${P}/leche-flan.jpg` },
  { label: "Buko Pandan", path: `${P}/buko-pandan.jpg` },
  { label: "Mango Sago", path: `${P}/mango-sago.jpg` },
  { label: "Bibingka", path: `${P}/bibingka.jpg` },
  // Coffee
  { label: "Brewed Coffee", path: `${P}/brewed-coffee.jpg` },
  { label: "Cafe Latte", path: `${P}/cafe-latte.jpg` },
  { label: "Cappuccino", path: `${P}/cappuccino.jpg` },
  { label: "Caramel Macchiato", path: `${P}/caramel-macchiato.jpg` },
  { label: "Americano", path: `${P}/americano.jpg` },
];

/** kebab-case slug helper used to derive the conventional filename. */
export function menuItemImageSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
