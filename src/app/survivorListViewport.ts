export const survivorListMobileQuery = "(max-width: 700px)";

export function shouldCollapseSurvivorListForViewport(width: number): boolean {
  return width <= 700;
}
