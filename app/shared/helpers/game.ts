export function getFileLiteral(rank: string | number): string {
  return String.fromCharCode(+rank + 97);
}

export function getRankLiteral(file: string | number): number {
  return +file + 1;
}
