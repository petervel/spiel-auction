import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import "./App.css";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";
import Profile from "./Profile";

function App() {
  const { isAuthenticated } = useAuth0();

  const [fairs, setFairs] = useState<
    Record<string, string | number | null | undefined>[]
  >([]);

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
  }, [isAuthenticated]);

  return (
    <>
      <div>
        {import.meta.env.VITE_AUTH0_DOMAIN}
        <LoginButton />
        {JSON.stringify(import.meta.env)}
      </div>
      <div>
        <Profile />
      </div>
      <div>
        <LogoutButton />
      </div>
      <div>{JSON.stringify(fairs)}</div>
    </>
  );
}

export default App;
