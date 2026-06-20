type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
};

/** Recursively extract plain text from a Tiptap JSON document. */
export function tiptapToText(json: object | null | undefined): string {
  if (!json) return "";
  const parts: string[] = [];

  function walk(node: TiptapNode) {
    if (node.text) parts.push(node.text);
    if (node.content) {
      for (const child of node.content) {
        walk(child);
      }
      // Add newline after block-level nodes so paragraphs are separated
      if (node.type && node.type !== "text" && node.type !== "doc") {
        parts.push("\n");
      }
    }
  }

  walk(json as TiptapNode);
  return parts.join("").trim();
}
