/**
 * Prettier の整形設定を返す。
 *
 * @returns プロジェクト共通の整形ルール。
 */
export default {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
  plugins: ['prettier-plugin-tailwindcss'],
}
