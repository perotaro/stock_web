/**
 * ISO 形式の日時を JST で整形する。
 *
 * @param value ISO 形式の日時文字列。
 * @returns `YYYY/MM/DD HH:mm` 形式の表示用文字列。
 */
export function formatJstDateTime(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(value))
}
