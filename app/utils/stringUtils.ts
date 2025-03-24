export const splitAuthors = (authorString: string): string[] => {
  if (!authorString) return [];
  return authorString
    .split(",")
    .map((author) => author.trim())
    .filter(Boolean);
};
