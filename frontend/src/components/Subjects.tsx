import { useEffect, useState } from "react";
import { sanityFetch } from "../lib/sanityFetch";
import { SUBJECTS_QUERY } from "../lib/queries";

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    sanityFetch(SUBJECTS_QUERY).then(setSubjects);
  }, []);

  return (
    <div>
      <h2>Subjects</h2>
      <ul>
        {subjects.map((s: any) => (
          <li key={s._id}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
}
