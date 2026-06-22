import { useState } from "react";
import "./ai-unified.css";

export default function AIUnifiedBar({
  onSubmit,
  onUpload
}: {
  onSubmit: (q: string) => void;
  onUpload: (file: File) => void;
}) {
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [filePreview, setFilePreview] = useState<File | null>(null);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSubmit(query);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      setFilePreview(file);
      onUpload(file);
    }
  };

  const handleUpload = (file: File) => {
    setFilePreview(file);
    onUpload(file);
  };

  return (
    <div className="ai-hero">
      <div
        className={`ai-bar ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {/* File preview */}
        {filePreview && (
          <div className="ai-file-preview">
            <span>{filePreview.name}</span>
          </div>
        )}

        {/* Input */}
        <input
          className="ai-input"
          placeholder="Ask anything or upload a file…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
        />

        {/* Upload */}
        <label className="ai-icon ai-upload">
          📁
          <input
            type="file"
            onChange={(e) =>
              e.target.files && handleUpload(e.target.files[0])
            }
          />
        </label>

        {/* Voice */}
        <button className="ai-icon ai-voice">🎤</button>
      </div>
    </div>
  );
}
