import { styleTags, tags as t } from '@lezer/highlight'

export const highlighting = styleTags({
  'App/Ident': t.function(t.variableName),
  Ident: t.variableName,
  Number: t.number,
  String: t.string,
  LineComment: t.lineComment,
  ArithOp: t.arithmeticOperator,
  'let op preload as': t.keyword,
  '"|>"': t.controlOperator,
  '"="': t.definitionOperator,
  '"(" ")" "[" "]"': t.paren,
  '","': t.separator,
  '";"': t.separator,
})