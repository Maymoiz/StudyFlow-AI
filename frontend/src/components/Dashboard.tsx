import GlobalSearch from "./GlobalSearch";
import "./dashboard.css";

export default function Dashboard() {
  return (
    <div className="dash-container">
      <h1 className="dash-title">Learning Dashboard</h1>
      <GlobalSearch />
    </div>
  );
}
