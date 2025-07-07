export const splitAuthors = (authorsString: string): string[] => {
  if (!authorsString) return [];

  return authorsString
    .split(/,|;|&|\band\b/)
    .map((author) => author.trim())
    .filter((author) => author.length > 0);
};
