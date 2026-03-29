import { onMount, onCleanup } from 'solid-js'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { codecanvas } from '../lang/grammar/language'

const theme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '20px',
    backgroundColor: '#1e1e2e',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    lineHeight: '1.6',
  },
  '.cm-content': { caretColor: '#cdd6f4' },
  '.cm-cursor': { borderLeftColor: '#cdd6f4' },
  '.cm-activeLine': { backgroundColor: '#313244' },
  '.cm-content ::selection': { backgroundColor: '#585b70' },
  '.cm-gutters': {
    backgroundColor: '#181825',
    color: '#585b70',
    borderRight: '1px solid #313244',
  },
  '.cm-activeLineGutter': { backgroundColor: '#313244' },
  '.cm-matchingBracket': { backgroundColor: '#585b7050', outline: '1px solid #89b4fa' },
}, { dark: true })

const highlightStyle = HighlightStyle.define([
  { tag: t.keyword,                          color: '#cba6f7', fontWeight: 'bold' },
  { tag: t.function(t.variableName),         color: '#89b4fa' },
  { tag: t.variableName,                     color: '#cdd6f4' },
  { tag: t.number,                           color: '#fab387' },
  { tag: t.string,                           color: '#a6e3a1' },
  { tag: t.lineComment,                      color: '#6c7086', fontStyle: 'italic' },
  { tag: [t.controlOperator, t.operator],    color: '#f38ba8' },
  { tag: t.definitionOperator,               color: '#94e2d5' },
  { tag: t.arithmeticOperator,               color: '#f9e2af' },
  { tag: t.paren,                            color: '#9399b2' },
  { tag: t.separator,                        color: '#6c7086' },
])

interface EditorProps {
  initialCode?: string
  onCodeChange?: (code: string) => void
}

export default function Editor(props: EditorProps) {
  let container!: HTMLDivElement
  let view: EditorView

  onMount(() => {
    const state = EditorState.create({
      doc: props.initialCode ?? '',
      extensions: [
        theme,
        lineNumbers(),
        history(),
        highlightActiveLine(),
        bracketMatching(),
        syntaxHighlighting(highlightStyle),
        codecanvas(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && props.onCodeChange) {
            props.onCodeChange(update.state.doc.toString())
          }
        }),
      ],
    })

    view = new EditorView({ state, parent: container })
  })

  onCleanup(() => view?.destroy())

  return <div ref={container} class="h-full w-full overflow-hidden" />
}