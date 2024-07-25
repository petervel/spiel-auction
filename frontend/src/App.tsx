import { useAuth0 } from "@auth0/auth0-react";
import "./App.css";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";
import Profile from "./Profile";

function App() {
  const { isAuthenticated } = useAuth0();

  // const [fairs, setFairs] = useState<
  //   Record<string, string | number | null | undefined>[]
  // >([]);

  // useEffect(() => {
  //   async function fetchData() {
  //     const response = await fetch(`/api/fairs`);
  //     if (response.status == 200) {
  //       const data = await response.json();
  //       setFairs(data);
  //     } else {
  //       console.error("Failed to fetch data:", response.statusText);
  //     }
  //   }
  //   fetchData();
  // }, [isAuthenticated]);

  return (
    <>
      {!isAuthenticated && (
        <div>
          <LoginButton />
        </div>
      )}
      {isAuthenticated && (
        <>
          <div>
            <Profile />
          </div>
          <div>
            <LogoutButton />
          </div>
          {/* <div>{JSON.stringify(fairs)}</div> */}
        </>
      )}
    </>
  );
}

export default App;
