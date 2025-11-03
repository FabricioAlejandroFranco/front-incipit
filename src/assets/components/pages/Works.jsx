import { useEffect, useState } from "react";
import api from "../services/api";
import IncipitCanvas from "../components/IncipitCanvas";

export default function Works() {
  const [works, setWorks] = useState([]);

  useEffect(() => {
    api
      .get("/works/")
      .then(({ data }) => setWorks(data))
      .catch(console.error);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Obras</h1>
      {works.map((w) => (
        <div key={w.id} className="border rounded p-3">
          <div className="font-semibold mb-2">{w.title}</div>
          {/* Dibuja el PAE de la obra */}
          <IncipitCanvas
            pae={w.marc_031_p}
            mode="list"
            width={800}
            height={220}
          />
        </div>
      ))}
    </div>
  );
}
