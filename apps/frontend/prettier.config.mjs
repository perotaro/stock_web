import * as prettierPluginTailwindcss from 'prettier-plugin-tailwindcss'

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
  plugins: [prettierPluginTailwindcss],
}
