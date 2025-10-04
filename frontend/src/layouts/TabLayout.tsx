// TabLayout.jsx
import { Outlet } from "react-router-dom";
import { TabBar } from "../components/TabBar/TabBar";

export default function TabLayout() {
	return (
		<>
            <TabBar />
			<Outlet /> {/* This renders the child route */}
		</>
	);
}
