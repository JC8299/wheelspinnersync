import { useState } from "react";
import "./App.css";

import { getRefreshCheck, loadSession } from "./util";
import HomePage from "./components/homePage";
import RoomPage from "./components/roomPage";

export default function App() {
  const [connection, setConnection] = useState(
    loadSession("connection")
      ? loadSession("connection")
      : getRefreshCheck("connection")
      ? getRefreshCheck("connection")
      : ""
  );
  const [nickname, setNickname] = useState(
    loadSession("nickname")
      ? loadSession("nickname")
      : getRefreshCheck("nickname")
      ? getRefreshCheck("nickname")
      : ""
  );

  return (
    <div className="bg-gray-800 flex flex-col items-center grow min-h-full">
      {connection !== "" ? (
        <RoomPage
          nickname={nickname}
          connection={connection}
          setNickname={setNickname}
          setConnection={setConnection}
        />
      ) : (
        <HomePage setConnection={setConnection} setNickname={setNickname} />
      )}
    </div>
  );
}
