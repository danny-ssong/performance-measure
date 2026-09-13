export const ALL_ITEMS = Array.from({ length: 20 }, (_, i) => `상품 ${i + 1}`);
export const PAGE_SIZE = 5;
export const TOTAL_PAGES = Math.ceil(ALL_ITEMS.length / PAGE_SIZE);
