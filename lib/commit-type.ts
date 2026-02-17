export const extractCommitType = (message: string): string => {
  const head = message.split('\n')[0]?.trim() ?? '';
  const conventionalMatch = head.match(/^(feat|fix|refactor|chore|docs|style|test|perf|build|ci)(\(.+\))?:/i);

  if (conventionalMatch?.[1]) {
    return conventionalMatch[1].toLowerCase();
  }

  if (/merge/i.test(head)) return 'merge';
  if (/revert/i.test(head)) return 'revert';
  return 'other';
};
