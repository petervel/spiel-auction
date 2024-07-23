import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [fairs, setFairs] = useState<any>([]);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch(`/api/fairs`);
      const data = await response.json();
      setFairs(data);
    }
    fetchData();
  }, []);

  return <>{JSON.stringify(fairs)}</>;
}

export default App;
