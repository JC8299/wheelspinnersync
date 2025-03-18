import { useRef, useState } from "react";
import { MdExpandLess, MdExpandMore } from "react-icons/md";
import { FaLock, FaLockOpen } from "react-icons/fa";

import { useIsOverflow } from "../util";

interface RoomRowProps {
  roomName: string;
  players: string[];
  password: boolean;
  playerCount: number;
}

export default function RoomRow({
  roomName,
  players,
  password,
  playerCount,
}: RoomRowProps) {
  const roomNameRef = useRef<HTMLDivElement>(null);
  const playersRef = useRef<HTMLDivElement>(null);
  const [expand, setExpand] = useState(false);
  const [roomNameOverflow, setRoomNameOverflow] = useState(false);
  const [playersOverflow, setPlayersOverflow] = useState(false);

  const isRoomNameOverflow = useIsOverflow(
    roomNameRef,
    (isOverflowFromCallback) => {
      setRoomNameOverflow(isOverflowFromCallback);
    }
  );
  const isPlayersOverflow = useIsOverflow(
    playersRef,
    (isOverflowFromCallback) => {
      setPlayersOverflow(isOverflowFromCallback);
    }
  );

  // console.log({
  //   roomName: roomName,
  //   isRoomNameOverflow: isRoomNameOverflow,
  //   isPlayersOverflow: isPlayersOverflow,
  //   expand: expand,
  // });

  return (
    <div className="">
      <div className={`grid grid-cols-6 col-span-6`}>
        <p
          className={`col-span-3 p-2 whitespace-nowrap overflow-hidden ${
            roomNameOverflow && "text-ellipsis"
          } ${expand && "text-wrap break-words"}`}
          ref={roomNameRef}
        >
          {roomName}
        </p>
        <p
          className={`col-span-1 p-2 whitespace-nowrap overflow-hidden ${
            playersOverflow && "text-ellipsis"
          } ${expand && "text-wrap break-words"}`}
          ref={playersRef}
        >
          {players.join(", ")}
        </p>
        <p className="col-span-1 p-2 flex justify-center text-xl">
          {password ? <FaLock /> : <FaLockOpen />}
        </p>
        <p className="col-span-1 p-2 text-center">{playerCount}</p>
      </div>
      {(roomNameOverflow || playersOverflow || expand) && (
        <button
          className="cursor-pointer bg-transparent hover:bg-slate-500 flex justify-center w-full rounded-b"
          onClick={(event) => {
            event.stopPropagation();
            setExpand(!expand);
          }}
        >
          {expand ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
        </button>
      )}
    </div>
  );
}
