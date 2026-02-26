import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { Fragment } from "@tiptap/pm/model";

/**
 * TipTap extension that adds Alt+ArrowUp / Alt+ArrowDown shortcuts
 * to move the current block node up or down among its siblings,
 * like Vim's :m or VS Code's Alt+Up/Down.
 */
export const MoveLines = Extension.create({
  name: "moveLines",

  addKeyboardShortcuts() {
    return {
      "Alt-ArrowUp": ({ editor }) => {
        const { state } = editor;
        const { $anchor } = state.selection;
        if ($anchor.depth < 1) return false;

        const index = $anchor.index(0);
        if (index === 0) return false;

        const blockPos = $anchor.before(1);
        const node = state.doc.child(index);
        const prevNode = state.doc.child(index - 1);
        const prevPos = blockPos - prevNode.nodeSize;
        const endPos = blockPos + node.nodeSize;
        const cursorOffset = $anchor.pos - blockPos;

        const tr = state.tr;
        tr.replaceWith(prevPos, endPos, Fragment.from([node, prevNode]));
        tr.setSelection(
          TextSelection.create(tr.doc, prevPos + cursorOffset),
        );
        editor.view.dispatch(tr.scrollIntoView());
        return true;
      },

      "Alt-ArrowDown": ({ editor }) => {
        const { state } = editor;
        const { $anchor } = state.selection;
        if ($anchor.depth < 1) return false;

        const index = $anchor.index(0);
        if (index >= state.doc.childCount - 1) return false;

        const blockPos = $anchor.before(1);
        const node = state.doc.child(index);
        const nextNode = state.doc.child(index + 1);
        const endPos = blockPos + node.nodeSize + nextNode.nodeSize;
        const cursorOffset = $anchor.pos - blockPos;

        const tr = state.tr;
        tr.replaceWith(blockPos, endPos, Fragment.from([nextNode, node]));
        const newCursorPos = blockPos + nextNode.nodeSize + cursorOffset;
        tr.setSelection(TextSelection.create(tr.doc, newCursorPos));
        editor.view.dispatch(tr.scrollIntoView());
        return true;
      },
    };
  },
});
