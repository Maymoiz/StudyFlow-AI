import "../styles/markdown.css";

interface Props {
  content: string;
}

// Lightweight markdown → HTML renderer (no deps)
function parseMarkdown(md: string): string {
  let html = md
    // Escape HTML entities first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks ```lang\n...\n```
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="md-code-block"><code class="md-code-lang-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Headings
  html = html.replace(/^#### (.+)$/gm, "<h4 class='md-h4'>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3 class='md-h3'>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2 class='md-h2'>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1 class='md-h1'>$1</h1>");

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code class='md-inline-code'>$1</code>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr class='md-hr' />");

  // Numbered lists — group consecutive items
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map(line =>
      `<li>${line.replace(/^\d+\. /, "")}</li>`
    ).join("");
    return `<ol class="md-ol">${items}</ol>`;
  });

  // Bullet lists — group consecutive items
  html = html.replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map(line =>
      `<li>${line.replace(/^[-*] /, "")}</li>`
    ).join("");
    return `<ul class="md-ul">${items}</ul>`;
  });

  // Paragraphs — wrap non-tag lines
  html = html.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (/^<(h[1-6]|ul|ol|li|pre|hr|blockquote)/.test(trimmed)) return trimmed;
    return `<p class="md-p">${trimmed}</p>`;
  }).join("\n");

  return html;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <div
      className="md-body"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}
