import ProfileList from "./ProfileList.jsx";
import AuthStatus from "./AuthStatus.jsx";
import "./App.css";

function App() {
  return (
    <div className="app-root">
      <header className="app-topbar" aria-label="App status">
        <AuthStatus />
      </header>
      <ProfileList
        onCreateNew={() => {
          /* Wire to create-profile flow when ready */
        }}
      />
    </div>
  );
}

export default App;
