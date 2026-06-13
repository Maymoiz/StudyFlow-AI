import { useEffect, useState } from "react";
import { sanity } from "../lib/sanity";
import { SUBJECTS_QUERY } from "../lib/queries";

export default function TestSanity() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sanity.fetch(SUBJECTS_QUERY)
      .then((data) => {
        setSubjects(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Sanity fetch error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading subjects...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Sanity Connection Test</h1>

      {subjects.length === 0 && <p>No subjects found in Sanity.</p>}

      <ul>
        {subjects.map((s) => (
          <li key={s._id}>
            <strong>{s.name}</strong> — {s.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
