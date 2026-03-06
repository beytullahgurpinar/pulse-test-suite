import { useCallback, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { basicLight, basicDark } from '@uiw/codemirror-theme-basic';
import { useColorScheme } from '@mui/joy/styles';
import { Sheet } from '@mui/joy';

interface Props {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
}

export interface JsonEditorRef {
  insertAtCursor: (text: string) => void;
}

export const JsonEditor = forwardRef<JsonEditorRef, Props>(function JsonEditor(
  { value, onChange, placeholder, minHeight = 200, readOnly = false },
  ref
) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const { mode, systemMode } = useColorScheme();
  const isDark = (mode === 'system' ? systemMode : mode) === 'dark';
  const themeExtension = useMemo(() => (isDark ? basicDark : basicLight), [isDark]);

  useImperativeHandle(ref, () => ({
    insertAtCursor: (text: string) => {
      const view = cmRef.current?.view;
      if (view && !readOnly) {
        view.focus();
        view.dispatch(view.state.update(view.state.replaceSelection(text)));
      }
    },
  }), [readOnly]);
  const handleChange = useCallback((v: string) => {
    onChange?.(v);
  }, [onChange]);

  return (
    <Sheet
      variant="outlined"
      sx={{
        overflow: 'hidden',
        borderRadius: 'sm',
        border: '1px solid',
        borderColor: 'divider',
        '& .cm-editor': {
          fontSize: '13px',
        },
        '& .cm-scroller': {
          fontFamily: '"Inter", "Roboto Mono", "Fira Code", monospace',
        },
      }}
    >
      <CodeMirror
        ref={cmRef}
        value={value || (placeholder ?? '')}
        onChange={readOnly ? undefined : handleChange}
        editable={!readOnly}
        theme={themeExtension}
        extensions={[
          json(),
          EditorView.lineWrapping,
          EditorView.theme({
            '&.cm-focused': {
              outline: 'none',
            },
            '.cm-content': {
              padding: '12px 0',
            },
          }),
        ]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          indentOnInput: true,
        }}
        style={{ minHeight }}
      />
    </Sheet>
  );
});
