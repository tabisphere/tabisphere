export function isFuzzyMatch(
  item: { title: string; url: string },
  searchValue: string
): boolean {
  const search = searchValue.toLowerCase().trim();
  if (!search) return true;

  const title = item.title?.toLowerCase() || "";
  const url = item.url?.toLowerCase() || "";

  // Simple fuzzy matching: check if all characters in search appear in order
  const checkFuzzyMatch = (text: string, search: string): boolean => {
    let searchIndex = 0;
    for (let i = 0; i < text.length && searchIndex < search.length; i++) {
      if (text[i] === search[searchIndex]) {
        searchIndex++;
      }
    }
    return searchIndex === search.length;
  };

  // Check if search matches title or URL (either exact contains or fuzzy)
  return (
    title.includes(search) ||
    url.includes(search) ||
    checkFuzzyMatch(title, search) ||
    checkFuzzyMatch(url, search)
  );
}