import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
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
import "@mdxeditor/editor/style.css";

function richMarkdownPlugins() {
  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin()
  ];
}

export default function MarkdownViewer({ id, updatedAt, markdown }: { id: string; updatedAt: string; markdown: string }) {
  return (
    <MDXEditor
      key={`${id}-${updatedAt}`}
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
    toolbarPlugin({
      toolbarContents: () => (
        <>
          <UndoRedo />
          <Separator />
          <BlockTypeSelect />
          <BoldItalicUnderlineToggles />
          <ListsToggle />
          <Separator />
          <CreateLink />
          <InsertTable />
          <InsertThematicBreak />
        </>
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
      autoFocus={{ defaultSelection: "rootEnd" }}
    />
  );
}
