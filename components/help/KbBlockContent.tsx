type KbTextNode = {
  type: string;
  text?: string;
  href?: string;
  content?: KbTextNode[];
  styles?: Record<string, unknown>;
};

export type KbBlock = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: KbTextNode[];
  children?: KbBlock[];
};

function renderTextNode(node: KbTextNode, key: number) {
  if (node.type === "link") {
    return (
      <a
        key={key}
        href={node.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-orange-400 hover:text-orange-300 underline"
      >
        {renderInline(node.content)}
      </a>
    );
  }

  const styles = node.styles ?? {};
  let el: React.ReactNode = node.text ?? "";
  if (styles.code) el = <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">{el}</code>;
  if (styles.bold) el = <strong>{el}</strong>;
  if (styles.italic) el = <em>{el}</em>;
  if (styles.underline) el = <u>{el}</u>;
  if (styles.strike) el = <s>{el}</s>;

  return <span key={key}>{el}</span>;
}

function renderInline(nodes?: KbTextNode[]) {
  return (nodes ?? []).map((node, i) => renderTextNode(node, i));
}

function renderHeading(block: KbBlock) {
  const level = (block.props?.level as number) ?? 1;
  const content = renderInline(block.content);
  if (level <= 1) return <h2 className="text-2xl font-semibold text-white mt-10 mb-4">{content}</h2>;
  if (level === 2) return <h3 className="text-xl font-semibold text-white mt-8 mb-3">{content}</h3>;
  return <h4 className="text-lg font-semibold text-white mt-6 mb-2">{content}</h4>;
}

function renderList(items: KbBlock[], ordered: boolean) {
  const Tag = ordered ? "ol" : "ul";
  const listClass = ordered
    ? "list-decimal list-outside pl-6 space-y-2 text-slate-300"
    : "list-disc list-outside pl-6 space-y-2 text-slate-300";

  return (
    <Tag className={listClass}>
      {items.map((item) => (
        <li key={item.id} className="leading-relaxed">
          {renderInline(item.content)}
          {item.children?.length ? <div className="mt-2">{renderBlocks(item.children)}</div> : null}
        </li>
      ))}
    </Tag>
  );
}

export function renderBlocks(blocks: KbBlock[]) {
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.type === "bulletListItem" || block.type === "numberedListItem") {
      const listType = block.type;
      const items: KbBlock[] = [];
      while (i < blocks.length && blocks[i].type === listType) {
        items.push(blocks[i]);
        i++;
      }
      out.push(
        <div key={items[0].id}>{renderList(items, listType === "numberedListItem")}</div>
      );
      continue;
    }

    if (block.type === "heading") {
      out.push(<div key={block.id}>{renderHeading(block)}</div>);
    } else if (block.type === "paragraph" && block.content?.length) {
      out.push(
        <p key={block.id} className="text-slate-300 leading-relaxed">
          {renderInline(block.content)}
        </p>
      );
    }

    i++;
  }

  return out;
}

/** Drops a leading top-level heading (used as the article title in the source content). */
export function dropLeadingTitle(blocks: KbBlock[]): KbBlock[] {
  if (blocks[0]?.type === "heading" && ((blocks[0].props?.level as number) ?? 1) === 1) {
    return blocks.slice(1);
  }
  return blocks;
}

export default function KbBlockContent({ blocks }: { blocks: KbBlock[] }) {
  return <div className="space-y-4">{renderBlocks(dropLeadingTitle(blocks))}</div>;
}
