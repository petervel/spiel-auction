import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [fairs, setFairs] = useState<any>([]);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch(`/api/fairs`);
      if (response.status == 200) {
        const data = await response.json();
        setFairs(data);
      } else {
        console.error("Failed to fetch data:", response.statusText);
      }
    }
    fetchData();
  }, []);

  return <>{JSON.stringify(fairs)}</>;
}

export default App;
