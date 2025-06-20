interface SearchDataItem {
  title: string;
  url: string;
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.replace(/[^a-z0-9]/g, ""));
}

export function isFuzzyMatch(
  item: SearchDataItem,
  query: string,
  maxWordLevenshteinDistance: number = 1
): boolean {
  if (
    !item ||
    typeof item.title !== "string" ||
    typeof query !== "string" ||
    query.trim() === ""
  ) {
    return false;
  }

  const lowerCaseQuery = query.toLowerCase();
  const queryTokens = tokenize(query);
  const lowerCaseTitle = item.title.toLowerCase();
  const titleTokens = tokenize(item.title);

  if (lowerCaseTitle.includes(lowerCaseQuery)) {
    return true;
  }

  let matchedQueryWordsCount = 0;

  for (const qToken of queryTokens) {
    let hasMatchForToken = false;
    let minDistanceForToken = Infinity;

    if (qToken.length < 2) {
      if (titleTokens.includes(qToken)) {
        hasMatchForToken = true;
      }
    } else {
      for (const tToken of titleTokens) {
        const distance = levenshteinDistance(qToken, tToken);
        if (distance < minDistanceForToken) {
          minDistanceForToken = distance;
        }
      }
      if (minDistanceForToken <= maxWordLevenshteinDistance) {
        hasMatchForToken = true;
      }
    }

    if (hasMatchForToken) {
      matchedQueryWordsCount++;
    }
  }

  return queryTokens.length === matchedQueryWordsCount;
}