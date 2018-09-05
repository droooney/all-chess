export function getFileLiteral(file: string | number): string {
  return String.fromCharCode(+file + 97);
}

export function getRankLiteral(rank: string | number): number {
  return +rank + 1;
}
