import {
  ChangeEvent,
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import {
  collection,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  doc,
  addDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

import { createSession } from "../util";
import ContentBox from "./contentBox";
import Modal from "./modal";
import RoomRow from "./roomRow";

type roomData = {
  roomName: string;
  players: string[];
  password: boolean;
  id: string;
};

interface HomePageProps {
  setConnection: Dispatch<SetStateAction<string>>;
  setNickname: Dispatch<SetStateAction<string>>;
}

export default function HomePage({
  setConnection,
  setNickname,
}: HomePageProps) {
  const [newRoomForm, setNewRoomForm] = useState({
    roomName: "",
    password: "",
    nickname: "",
  });
  const [joinRoomForm, setJoinRoomForm] = useState({
    roomId: "",
    password: "",
    nickname: "",
  });
  const [rooms, setRooms] = useState<roomData[]>([]);
  const [isJoinRoomModalOpen, setIsJoinRoomModalOpen] = useState(false);
  const [joinRoomModalData, setJoinRoomModalData] = useState({
    roomName: "",
    roomPassword: false,
  });
  const [formErrors, setFormErrors] = useState({
    nickname: false,
    password: false,
  });

  const connect = (nickname: string, connection: string) => {
    createSession({ nickname: nickname, connection: connection });
    setNickname(nickname);
    setConnection(connection);
  };

  useEffect(() => {
    const query = collection(db, "rooms");
    const unsubscribe = onSnapshot(query, (snapshot: QuerySnapshot) => {
      let roomList: roomData[] = [];
      let deleteRooms: string[] = [];
      snapshot.forEach((doc: DocumentData) => {
        // console.log(doc.id, " => ", doc.data());

        // check if any player in a room have been active under 30 mins ago
        let roomPlayers = doc.data().players;
        let inactiveRoom = true;

        for (let player in roomPlayers) {
          if (roomPlayers[player] !== null) {
            let prevTimestamp = roomPlayers[player].toDate();
            if (Date.now() - prevTimestamp < 1800000) {
              roomList.push({
                roomName: doc.data().name,
                players: doc.data().players
                  ? Object.keys(doc.data().players)
                  : [],
                password: doc.data().password,
                id: doc.id,
              });
              inactiveRoom = false;
              break;
            }
          }
        }

        // Add inactive rooms to an array
        // I cannot delete any rooms that have a password so that would have to be deleted from the console
        if (
          inactiveRoom &&
          !doc.data().password &&
          doc.data().createdAt &&
          Date.now() - doc.data().createdAt.toDate().getTime() > 1000
        ) {
          // console.log(
          //   `deleting ${doc.id}\n${Date.now()} - ${doc
          //     .data()
          //     .createAt.toDate()
          //     .getTime()} = ${
          //     Date.now() - doc.data().createdAt.toDate().getTime() > 1000
          //   }`
          // );
          deleteRooms.push(doc.id);
        }
      });

      // Delete public rooms with inactive users
      if (deleteRooms.length > 0) {
        // console.log(deleteRooms);
        Promise.all(
          deleteRooms.map(async (roomId) => {
            await deleteDoc(doc(db, `rooms/${roomId}/wheel/items`));
            await deleteDoc(doc(db, `rooms/${roomId}`));
          })
        );
      }
      setRooms(roomList);
    });
    return () => {
      // console.log("clearing rooms listener");
      unsubscribe();
    };
  }, []);

  const handleNewRoomChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewRoomForm({
      ...newRoomForm,
      [event.target.name]: event.target.value,
    });
  };

  const handleJoinRoomChange = (event: ChangeEvent<HTMLInputElement>) => {
    setJoinRoomForm({
      ...joinRoomForm,
      [event.target.name]: event.target.value,
    });
  };

  async function handleMakeRoomOnSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newRoomForm.nickname === "" || newRoomForm.roomName === "") return;

    // console.log(`creating new room: ${newRoomForm.roomName}`);
    const docRef = await addDoc(collection(db, "rooms"), {
      name: newRoomForm.roomName,
      password: newRoomForm.password !== "",
      players: { [newRoomForm.nickname]: serverTimestamp() },
      createdAt: serverTimestamp(),
    });

    // wanted to encrypt password but i think the way i implemented this doesn't allow for it as it caused issues with illegal characters
    const wheelDocId = newRoomForm.password ? newRoomForm.password : "items";

    // console.log(`creating wheel for: ${docRef.id}`);
    await setDoc(doc(db, `rooms/${docRef.id}/wheel`, wheelDocId), {
      latestSpinTime: serverTimestamp(),
      rotation: 0,
      wheelItems: [],
    });

    connect(newRoomForm.nickname, docRef.id + " " + wheelDocId);
  }

  async function handleJoinRoomOnSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (joinRoomForm.nickname === "" || joinRoomForm.roomId === "") return;

    setFormErrors({ nickname: false, password: false });

    let joinError = false;

    const docRef = await getDoc(doc(db, "rooms", joinRoomForm.roomId));
    if (!docRef.exists()) return;

    const docData = docRef.data();

    if (joinRoomForm.nickname in docData.players) {
      joinError = true;
      setFormErrors({ nickname: true, password: formErrors.password });
      return;
    }

    let wheelId = null;
    if (docData.password) {
      const password = joinRoomForm.password;

      const wheelRef = await getDoc(
        doc(db, `rooms/${docRef.id}/wheel/${password}`)
      );

      if (wheelRef.exists()) {
        wheelId = password;
      } else {
        joinError = true;
        setFormErrors({ nickname: formErrors.nickname, password: true });
        return;
      }
    } else {
      wheelId = "items";
    }

    if (!joinError) {
      connect(joinRoomForm.nickname, docRef.id + " " + wheelId);
    }
  }

  return (
    <div className="flex flex-col w-[750px] lg:w-[970px] xl:w-[1170px]">
      <h1 className="text-white text-4xl font-medium mt-5 mb-3 select-none">
        WheelSpinnerSync
      </h1>

      <div className="flex flex-col lg:flex-row gap-x-8">
        <div className="basis-0 grow lg:grow-[7]">
          <ContentBox title="Rooms">
            <div className="w-full text-left text-sm select-none">
              <div className="grid grid-cols-6">
                <p className="col-span-3 p-2 pt-0">Room Name</p>
                <p className="col-span-1 p-2 pt-0">Players</p>
                <p className="col-span-1 p-2 pt-0 text-center">Password</p>
                <p className="col-span-1 p-2 pt-0 text-center">Count</p>
              </div>
              {rooms.length > 0 ? (
                rooms.map((room) => {
                  return (
                    <div className="border-t border-slate-950" key={room.id}>
                      <div
                        className="hover:bg-slate-600 rounded cursor-pointer"
                        onClick={() => {
                          setJoinRoomForm({
                            roomId: room.id,
                            password: "",
                            nickname: "",
                          });
                          setJoinRoomModalData({
                            roomName: room.roomName,
                            roomPassword: room.password,
                          });
                          setIsJoinRoomModalOpen(true);
                        }}
                      >
                        <RoomRow
                          roomName={room.roomName}
                          players={room.players}
                          password={room.password}
                          playerCount={room.players.length}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="border-t border-slate-950 p-2 pt-3">
                  No Rooms Available
                </div>
              )}
            </div>
          </ContentBox>
        </div>

        <div className="basis-0 md:grow lg:grow-[5]">
          <ContentBox title="New Room">
            <form
              className=""
              onSubmit={handleMakeRoomOnSubmit}
              autoComplete="off"
            >
              <div className="flex flex-col mb-4">
                <label className="text-sm font-bold">Room Name</label>
                <input
                  className="px-3 py-2 border border-slate-950 rounded h-9 outline-none text-black text-sm bg-[#e2e8f0]"
                  type="text"
                  name="roomName"
                  value={newRoomForm.roomName}
                  onChange={handleNewRoomChange}
                  maxLength={255}
                  required={true}
                  autoComplete="new-password"
                  placeholder={
                    newRoomForm.nickname !== ""
                      ? `${newRoomForm.nickname}'s Room`
                      : "Room Name"
                  }
                />
              </div>

              <div className="flex flex-col mb-4">
                <label className="text-sm font-bold">Password</label>
                <input
                  className="px-3 py-2 border border-slate-950 rounded h-9 outline-none text-black text-sm bg-[#e2e8f0]"
                  type="password"
                  name="password"
                  value={newRoomForm.password}
                  onChange={handleNewRoomChange}
                  maxLength={255}
                  placeholder="Optional"
                />
              </div>

              <div className="flex flex-col mb-4">
                <label className="text-sm font-bold">Nickname</label>
                <input
                  className="px-3 py-2 border border-slate-950 rounded h-9 outline-none text-black text-sm bg-[#e2e8f0]"
                  type="text"
                  name="nickname"
                  value={newRoomForm.nickname}
                  onChange={handleNewRoomChange}
                  maxLength={255}
                  required={true}
                  placeholder="Nickname"
                />
              </div>

              <div className="w-full flex justify-center">
                <button
                  className="text-black bg-[#e2e8f0] border border-slate-950 m-0 px-3 py-2 rounded text-sm"
                  type="submit"
                >
                  Make Room
                </button>
              </div>
            </form>
          </ContentBox>
        </div>
      </div>

      {/* modal */}
      {isJoinRoomModalOpen && (
        <Modal
          isOpen={isJoinRoomModalOpen}
          onClose={() => {
            setJoinRoomForm({
              roomId: "",
              password: "",
              nickname: "",
            });
            setIsJoinRoomModalOpen(false);
            setJoinRoomModalData({ roomName: "", roomPassword: false });
          }}
          title="Join Room"
        >
          <form onSubmit={handleJoinRoomOnSubmit}>
            <div className="flex flex-col mb-4">
              <label className="text-sm font-bold">Room Name</label>
              <div className="text-sm font-bold">
                {joinRoomModalData.roomName}
              </div>
            </div>

            {joinRoomModalData.roomPassword && (
              <div className="flex flex-col mb-4">
                <label className="text-sm font-bold">Password</label>
                <input
                  className="px-3 py-2 border border-slate-950 rounded h-9 outline-none text-black text-sm bg-[#e2e8f0]"
                  type="password"
                  name="password"
                  value={joinRoomForm.password}
                  onChange={handleJoinRoomChange}
                  maxLength={255}
                />
                {formErrors.password && (
                  <p className="text-red-500 text-sm mt-1">
                    Incorrect Password
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col mb-4">
              <label className="text-sm font-bold">Nickname</label>
              <input
                className="px-3 py-2 border border-slate-950 rounded h-9 outline-none text-black text-sm bg-[#e2e8f0]"
                type="text"
                name="nickname"
                value={joinRoomForm.nickname}
                onChange={handleJoinRoomChange}
                maxLength={255}
                required={true}
                placeholder="Nickname"
              />
              {formErrors.nickname && (
                <p className="text-red-500 text-sm mt-1">
                  Nickname already in room
                </p>
              )}
            </div>

            <div className="w-full flex flex-row justify-center">
              <button
                type="submit"
                className="text-black bg-[#e2e8f0] border border-slate-950 m-0 px-3 py-2 rounded text-sm"
              >
                Join
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
