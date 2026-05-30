import {
  AdmonitionDirectiveDescriptor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ChangeAdmonitionType,
  ChangeCodeMirrorLanguage,
  CodeToggle,
  codeBlockPlugin,
  codeMirrorPlugin,
  ConditionalContents,
  CreateLink,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  directivesPlugin,
  type EditorInFocus,
  headingsPlugin,
  iconComponentFor$,
  imagePlugin,
  InsertImage,
  InsertCodeBlock,
  InsertTable,
  InsertThematicBreak,
  insertDirective$,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  useCellValue,
  usePublisher,
  useTranslation,
  readOnly$,
  Button
} from "@mdxeditor/editor";
import { createPortal } from "react-dom";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForwardedRef, MutableRefObject } from "react";
import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { csharp } from "@codemirror/legacy-modes/mode/clike";
import { Prec } from "@codemirror/state";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { tags as highlightTags } from "@lezer/highlight";
import { normalizeMarkdownMediaPaths } from "./api/client";

const codeBlockLanguages = [
  { name: "Text", alias: ["text", "txt", "plain"] },
  { name: "Bash", alias: ["bash", "sh", "shell"], support: StreamLanguage.define(shell) },
  { name: "JavaScript", alias: ["js", "javascript"], support: javascript() },
  { name: "CSS", alias: ["css"], support: css() },
  { name: "TypeScript", alias: ["ts", "typescript"], support: javascript({ typescript: true }) },
  { name: "Python", alias: ["python", "py"], support: python() },
  { name: "Ruby", alias: ["ruby", "rb"], support: StreamLanguage.define(ruby) },
  { name: "PHP", alias: ["php"], support: php({ plain: true }) },
  { name: "Java", alias: ["java"], support: java() },
  { name: "Go", alias: ["go", "golang"], support: go() },
  { name: "C++", alias: ["cpp", "c++", "cc", "cxx"], support: cpp() },
  { name: "C#", alias: ["csharp", "c#", "cs"], support: StreamLanguage.define(csharp) },
  { name: "SQL", alias: ["sql"], support: sql() }
];

const openAiCodeHighlight = HighlightStyle.define([
  {
    tag: [
      highlightTags.keyword,
      highlightTags.definitionKeyword,
      highlightTags.moduleKeyword,
      highlightTags.operatorKeyword,
      highlightTags.controlKeyword
    ],
    class: "mn-code-keyword"
  },
  {
    tag: [highlightTags.string, highlightTags.special(highlightTags.string)],
    class: "mn-code-string"
  },
  {
    tag: [highlightTags.propertyName, highlightTags.attributeName],
    class: "mn-code-property"
  },
  {
    tag: [
      highlightTags.name,
      highlightTags.variableName,
      highlightTags.definition(highlightTags.name),
      highlightTags.definition(highlightTags.variableName),
      highlightTags.function(highlightTags.variableName),
      highlightTags.function(highlightTags.propertyName)
    ],
    class: "mn-code-name"
  },
  {
    tag: [
      highlightTags.standard(highlightTags.name),
      highlightTags.standard(highlightTags.variableName)
    ],
    class: "mn-code-builtin"
  },
  {
    tag: [highlightTags.number, highlightTags.bool, highlightTags.null, highlightTags.atom],
    class: "mn-code-literal"
  },
  {
    tag: [highlightTags.className, highlightTags.typeName, highlightTags.namespace],
    class: "mn-code-name"
  },
  {
    tag: highlightTags.comment,
    class: "mn-code-comment"
  },
  {
    tag: [highlightTags.operator, highlightTags.punctuation, highlightTags.bracket],
    class: "mn-code-punctuation"
  }
]);

type AdmonitionType = "note" | "tip" | "danger" | "info" | "caution";

function InsertMianotesAdmonition() {
  const insertDirective = usePublisher(insertDirective$);
  const iconComponentFor = useCellValue(iconComponentFor$);
  const readOnly = useCellValue(readOnly$);
  const t = useTranslation();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const title = t("toolbar.admonition", "Insert Admonition");
  const items = useMemo(
    () => [
      { value: "note" as const, label: t("admonitions.note", "Note") },
      { value: "tip" as const, label: t("admonitions.tip", "Tip") },
      { value: "danger" as const, label: t("admonitions.danger", "Danger") },
      { value: "info" as const, label: t("admonitions.info", "Info") },
      { value: "caution" as const, label: t("admonitions.caution", "Caution") }
    ],
    [t]
  );

  const updateMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const menuWidth = 168;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
    setMenuPosition({ top: rect.bottom + 8, left });
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (buttonRef.current?.contains(target) || menuRef.current?.contains(target))) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, updateMenuPosition]);

  const chooseAdmonition = (name: AdmonitionType) => {
    insertDirective({
      type: "containerDirective",
      name
    });
    setOpen(false);
  };

  return (
    <>
      <Button
        ref={buttonRef}
        aria-label={title}
        title={title}
        disabled={readOnly}
        className="mianotes-admonition-trigger"
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        {iconComponentFor("admonition")}
        <span className="mianotes-admonition-trigger-arrow">{iconComponentFor("arrow_drop_down")}</span>
      </Button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="mianotes-admonition-menu"
              role="menu"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              {items.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="menuitem"
                  onClick={() => chooseAdmonition(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

const codeMirrorThemeExtensions = [
  Prec.highest(syntaxHighlighting(openAiCodeHighlight))
];

const fencedCodeBlockPattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;
const autolinkPattern = /^<(?:[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*|[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)>/;
const htmlTagPattern = /^<\/?([A-Za-z][A-Za-z0-9-]*)(?=[\s>/])[^<>]*?>/;
const accidentalTextDirectivePattern = /(?<![\\:]):(?=[A-Za-z])/g;
const htmlTagNames = new Set([
  "a", "abbr", "address", "article", "aside", "b", "base", "blockquote", "br",
  "caption", "cite", "code", "col", "colgroup", "dd", "del", "details", "div",
  "dl", "dt", "em", "figcaption", "figure", "footer", "h1", "h2", "h3", "h4",
  "h5", "h6", "header", "hr", "i", "iframe", "img", "input", "ins", "kbd",
  "li", "link", "main", "mark", "meta", "nav", "object", "ol", "p", "param",
  "pre", "q", "s", "samp", "section", "small", "source", "span", "strong",
  "sub", "summary", "sup", "table", "tbody", "td", "tfoot", "th", "thead",
  "track", "tr", "u", "ul", "var"
]);

function contentKey(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index) | 0;
  }
  return `${value.length}-${hash}`;
}

function isAdmonition(editorInFocus: EditorInFocus | null) {
  const node = editorInFocus?.rootNode;
  if (!node || node.getType() !== "directive") return false;
  const directiveName = (node as unknown as { getMdastNode?: () => { name?: string } }).getMdastNode?.().name;
  return ["note", "tip", "important", "warning", "danger", "info", "caution"].includes(directiveName ?? "");
}

function escapeAngleBrackets(text: string) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeMdxUnsafeInlineText(text: string) {
  let output = "";
  let index = 0;
  while (index < text.length) {
    if (text[index] !== "<") {
      output += text[index];
      index += 1;
      continue;
    }

    const rest = text.slice(index);
    const autolink = rest.match(autolinkPattern);
    if (autolink) {
      output += autolink[0];
      index += autolink[0].length;
      continue;
    }

    const htmlTag = rest.match(htmlTagPattern);
    if (htmlTag) {
      output += htmlTagNames.has(htmlTag[1].toLowerCase()) ? htmlTag[0] : escapeAngleBrackets(htmlTag[0]);
      index += htmlTag[0].length;
      continue;
    }

    output += "&lt;";
    index += 1;
  }
  return output;
}

function normalizeMdxUnsafeMarkdown(markdown: string) {
  return markdown
    .split(fencedCodeBlockPattern)
    .map((part, index) => {
      if (index % 2 !== 0) return part;
      return escapeMdxUnsafeInlineText(part).replace(accidentalTextDirectivePattern, "\\:");
    })
    .join("");
}

function normalizeEditorMarkdown(markdown: string) {
  return normalizeMdxUnsafeMarkdown(normalizeMarkdownMediaPaths(markdown));
}

function SourceModeToolbar() {
  return (
    <span className="source-mode-toolbar">
      <span>Markdown source</span>
      <span className="source-mode-hint">Use the toggle to return to rich text.</span>
    </span>
  );
}

type ImageUploadHandler = (image: File) => Promise<string>;

function richMarkdownPlugins(imageUploadHandler?: ImageUploadHandler) {
  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    imagePlugin({ disableImageResize: true, imageUploadHandler }),
    tablePlugin(),
    thematicBreakPlugin(),
    directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
    codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
    codeMirrorPlugin({
      codeBlockLanguages,
      autoLoadLanguageSupport: false,
      codeMirrorExtensions: codeMirrorThemeExtensions
    }),
    markdownShortcutPlugin()
  ];
}

export default function MarkdownViewer({ id, updatedAt, markdown }: { id: string; updatedAt: string; markdown: string }) {
  const normalizedMarkdown = normalizeEditorMarkdown(markdown);
  return (
    <MDXEditor
      key={`${id}-${updatedAt}-${contentKey(normalizedMarkdown)}`}
      markdown={normalizedMarkdown}
      readOnly
      plugins={richMarkdownPlugins()}
      className="mianotes-rich-viewer"
      contentEditableClassName="mianotes-rich-content"
    />
  );
}

function richMarkdownEditorPlugins(imageUploadHandler?: ImageUploadHandler) {
  return [
    ...richMarkdownPlugins(imageUploadHandler),
    diffSourcePlugin({ viewMode: "rich-text", codeMirrorExtensions: codeMirrorThemeExtensions }),
    toolbarPlugin({
      toolbarContents: () => (
        <DiffSourceToggleWrapper options={["rich-text", "source"]} SourceToolbar={<SourceModeToolbar />}>
          <UndoRedo />
          <Separator />
          <ConditionalContents
            options={[
              { when: (editor) => editor?.editorType === "codeblock", contents: () => <ChangeCodeMirrorLanguage /> },
              { when: isAdmonition, contents: () => <ChangeAdmonitionType /> },
              { fallback: () => <BlockTypeSelect /> }
            ]}
          />
          <BoldItalicUnderlineToggles />
          <ListsToggle />
          <Separator />
          <CreateLink />
          <InsertImage />
          <InsertTable />
          <InsertThematicBreak />
          <InsertMianotesAdmonition />
          <InsertCodeBlock />
          <CodeToggle />
        </DiffSourceToggleWrapper>
      )
    })
  ];
}

type MarkdownEditorProps = {
  id: string;
  markdown: string;
  onChange: (markdown: string) => void;
  imageUploadHandler?: ImageUploadHandler;
  autoFocus?: boolean;
  onAutoFocused?: () => void;
};

function assignForwardedRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref) {
    (ref as MutableRefObject<T | null>).current = value;
  }
}

export const MarkdownEditor = forwardRef<MDXEditorMethods, MarkdownEditorProps>(function MarkdownEditor(
  {
    id,
    markdown,
    onChange,
    imageUploadHandler,
    autoFocus = false,
    onAutoFocused
  },
  ref
) {
  const normalizedMarkdown = normalizeEditorMarkdown(markdown);
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const setEditorRef = useCallback((editor: MDXEditorMethods | null) => {
    editorRef.current = editor;
    assignForwardedRef(ref, editor);
  }, [ref]);

  useEffect(() => {
    if (!autoFocus) return;

    const timeout = window.setTimeout(() => {
      editorRef.current?.focus();
      onAutoFocused?.();
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [autoFocus, id, onAutoFocused]);

  return (
    <MDXEditor
      ref={setEditorRef}
      key={`${id}-editing`}
      markdown={normalizedMarkdown}
      onChange={(nextMarkdown) => onChange(nextMarkdown)}
      plugins={richMarkdownEditorPlugins(imageUploadHandler)}
      className="mianotes-rich-editor"
      contentEditableClassName="mianotes-rich-content"
    />
  );
});
