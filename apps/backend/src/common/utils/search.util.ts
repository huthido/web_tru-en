/**
 * Build search conditions for Prisma queries
 */
export interface SearchOptions {
  search?: string;
  searchFields?: string[];
}

export function buildSearchConditions(
  options: SearchOptions
): Record<string, any> | undefined {
  if (!options.search || !options.searchFields || options.searchFields.length === 0) {
    return undefined;
  }

  const searchTerm = options.search.trim();
  if (!searchTerm) {
    return undefined;
  }

  // For PostgreSQL, use case-insensitive search
  return {
    OR: options.searchFields.map((field) => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const,
      },
    })),
  };
}

