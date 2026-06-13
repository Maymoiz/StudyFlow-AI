import { useState } from "react";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [listening, setListening] = useState(false);
  const [response, setResponse] = useState("");

  // Handle text input
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query && !file) return;

    const formData = new FormData();
    formData.append("query", query);
    if (file) formData.append("file", file);

    const res = await fetch("http://localhost:3000/api/search", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResponse(data.answer);
  };

  // Handle file upload
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Voice search
  const startVoice = () => {
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    setListening(true);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setQuery(text);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
  };

  return (
    <div className="dashboard">
      <h1>What do you want to study today?</h1>

      <form className="search-box" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask anything…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <label className="upload-btn">
          <input type="file" onChange={handleFile} />
          📄
        </label>

        <button
          type="button"
          className="voice-btn"
          onClick={startVoice}
        >
          🎤
        </button>

        <button type="submit" className="go-btn">
          ➜
        </button>
      </form>

      {file && (
        <p className="file-info">Uploaded: {file.name}</p>
      )}
      
      {listening && <p className="listening">Listening… 🎤</p>}


      <div className="response-box">
        {response ? response : "Your AI responses will appear here."}
      </div>
    </div>
  );
}
