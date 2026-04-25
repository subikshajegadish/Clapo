import ProfileList from "./ProfileList.jsx";
import "./App.css";

function App() {
  return (
    <div className="app-root">
      <ProfileList
        onCreateNew={() => {
          /* Wire to create-profile flow when ready */
        }}
      />
    </div>
  );
}

export default App;
