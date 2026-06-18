import "../styles/markdown.css";

interface Props { content: string; }

function parseMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="md-code-block"><code class="md-lang-${lang || "text"}">${code.trim()}</code></pre>`
  );

  // Headings
  html = html.replace(/^#### (.+)$/gm, "<h4 class='md-h4'>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3 class='md-h3'>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2 class='md-h2'>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1 class='md-h1'>$1</h1>");

  // Answer line  ✅ **Answer: ...**
  html = html.replace(
    /^✅ \*\*Answer: (.+?)\*\*$/gm,
    "<p class='md-answer'>✅ <strong>Answer: $1</strong></p>"
  );

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code class='md-inline-code'>$1</code>");

  // HR
  html = html.replace(/^---$/gm, "<hr class='md-hr' />");

  // Numbered lists — group consecutive items
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n")
      .map(l => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("");
    return `<ol class="md-ol">${items}</ol>`;
  });

  // Bullet lists — group consecutive items
  html = html.replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n")
      .map(l => `<li>${l.replace(/^[-*] /, "")}</li>`).join("");
    return `<ul class="md-ul">${items}</ul>`;
  });

  // Paragraphs
  html = html.split("\n").map(line => {
    const t = line.trim();
    if (!t) return "";
    if (/^<(h[1-6]|ul|ol|li|pre|hr|p class)/.test(t)) return t;
    return `<p class="md-p">${t}</p>`;
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
