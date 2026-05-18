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
  InsertAdmonition,
  InsertCodeBlock,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo
} from "@mdxeditor/editor";
import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { StreamLanguage } from "@codemirror/language";
import { csharp } from "@codemirror/legacy-modes/mode/clike";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import "@mdxeditor/editor/style.css";

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
  { name: "C++", alias: ["cpp", "c++", "cc", "cxx"], support: cpp() },
  { name: "C#", alias: ["csharp", "c#", "cs"], support: StreamLanguage.define(csharp) },
  { name: "SQL", alias: ["sql"], support: sql() }
];

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
  return ["note", "tip", "danger", "info", "caution"].includes(directiveName ?? "");
}

function SourceModeToolbar() {
  return (
    <span className="source-mode-toolbar">
      <span>Markdown source</span>
      <span className="source-mode-hint">Use the toggle to return to rich text.</span>
    </span>
  );
}

function richMarkdownPlugins() {
  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    thematicBreakPlugin(),
    directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
    codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
    codeMirrorPlugin({ codeBlockLanguages, autoLoadLanguageSupport: false }),
    markdownShortcutPlugin()
  ];
}

export default function MarkdownViewer({ id, updatedAt, markdown }: { id: string; updatedAt: string; markdown: string }) {
  return (
    <MDXEditor
      key={`${id}-${updatedAt}-${contentKey(markdown)}`}
      markdown={markdown}
      readOnly
      plugins={richMarkdownPlugins()}
      contentEditableClassName="mianotes-rich-content"
    />
  );
}

function richMarkdownEditorPlugins() {
  return [
    ...richMarkdownPlugins(),
    diffSourcePlugin({ viewMode: "rich-text" }),
    toolbarPlugin({
      toolbarContents: () => (
        <ConditionalContents
          options={[
            {
              when: (editor) => editor?.editorType === "codeblock",
              contents: () => <ChangeCodeMirrorLanguage />
            },
            {
              fallback: () => (
                <DiffSourceToggleWrapper options={["rich-text", "source"]} SourceToolbar={<SourceModeToolbar />}>
                  <UndoRedo />
                  <Separator />
                  <ConditionalContents
                    options={[
                      { when: isAdmonition, contents: () => <ChangeAdmonitionType /> },
                      { fallback: () => <BlockTypeSelect /> }
                    ]}
                  />
                  <BoldItalicUnderlineToggles />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <InsertTable />
                  <InsertThematicBreak />
                  <InsertAdmonition />
                  <InsertCodeBlock />
                  <CodeToggle />
                </DiffSourceToggleWrapper>
              )
            }
          ]}
        />
      )
    })
  ];
}

export function MarkdownEditor({
  id,
  markdown,
  onChange
}: {
  id: string;
  markdown: string;
  onChange: (markdown: string) => void;
}) {
  return (
    <MDXEditor
      key={`${id}-editing`}
      markdown={markdown}
      onChange={(nextMarkdown) => onChange(nextMarkdown)}
      plugins={richMarkdownEditorPlugins()}
      className="mianotes-rich-editor"
      contentEditableClassName="mianotes-rich-content"
    />
  );
}
