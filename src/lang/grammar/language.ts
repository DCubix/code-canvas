import { LRLanguage, LanguageSupport } from '@codemirror/language'
import { parser } from '../grammar/parser'
import { highlighting } from '../grammar/highlight'

const codecanvasLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [highlighting],
  }),
  languageData: {
    commentTokens: { line: '--' },
  },
})

export function codecanvas(): LanguageSupport {
  return new LanguageSupport(codecanvasLanguage)
}