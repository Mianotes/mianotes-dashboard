import {
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin
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
