import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  deleteField,
  doc,
  FieldValue,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { FaPlus } from "react-icons/fa";

import {
  setSessionItem,
  getSessionValue,
  unloadSession,
  setRefreshCheck,
  clearRefreshCheck,
} from "../util";
import ContentBox from "./contentBox";
import Wheel from "./wheel/wheel";
import Modal from "./modal";
import ColorRadioButton from "./colorRadio/colorRadioButton";
import WheelOptionRow from "./wheelOptionRow";

type WheelOption = {
  optionName: string;
  color: string;
  size?: number;
};

interface RoomPageProps {
  nickname: string;
  connection: string;
  setNickname: Dispatch<SetStateAction<string>>;
  setConnection: Dispatch<SetStateAction<string>>;
}

export default function RoomPage({
  nickname,
  connection,
  setNickname,
  setConnection,
}: RoomPageProps) {
  const [result, setResult] = useState("");
  const [rotation, setRotation] = useState(0);
  const [latestSpinTime, setLatestSpinTime] = useState(null);
  const [wheelOptions, setWheelOptions] = useState<WheelOption[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [roomName, setRoomName] = useState<string>("");
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [addItemForm, setAddItemForm] = useState({
    optionName: "",
    color: "",
    size: 0,
  });
  const [editItemForm, setEditItemForm] = useState({
    optionName: "",
    color: "",
    size: 0,
    prevOptionName: "",
    prevColor: "",
    prevSize: 0,
  });
  const [addItemModal, setAddItemModal] = useState<boolean>(false);
  const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] =
    useState<boolean>(false);
  const [deleteItemForm, setDeleteItemForm] = useState({
    optionName: "",
    color: "",
    size: 0,
  });
  const connectionIds = connection.split(" ");

  const leaveRoom = async () => {
    if (nickname === "" || connection === "") return;
    const roomDocRef = doc(db, `rooms/${connectionIds[0]}`);
    const roomDoc = await getDoc(roomDocRef);

    if (roomDoc.exists()) {
      let roomPlayers = roomDoc.data().players;
      // check if other players are still connected
      let connectedPlayers = false;
      for (let player in roomPlayers) {
        let prevTimestamp = roomPlayers[player].toDate();
        if (player !== nickname && Date.now() - prevTimestamp < 1800000) {
          connectedPlayers = true;
          break;
        }
      }

      if (
        !connectedPlayers &&
        roomDoc.data().createdAt &&
        Date.now() - roomDoc.data().createdAt.toDate().getTime() > 1000
      ) {
        // console.log("deleting room and wheel");
        await deleteDoc(
          doc(db, `rooms/${connectionIds[0]}/wheel/${connectionIds[1]}`)
        );
        await deleteDoc(doc(db, `rooms/${connectionIds[0]}`));
        unloadSession();
        setNickname("");
        setConnection("");
      } else {
        // console.log(`${nickname} leaving room`);
        await updateDoc(roomDocRef, { [`players.${nickname}`]: deleteField() });
        unloadSession();
        setNickname("");
        setConnection("");
      }
    }
  };

  useEffect(() => {
    let unsubscribeWheel: () => void | undefined;
    let unsubscribeRoom: () => void | undefined;

    const fetchWheelAndRoomListeners = async () => {
      const wheelId = connectionIds[1];
      const roomId = connectionIds[0];

      if (wheelId) {
        const wheelDocRef = doc(db, `rooms/${roomId}/wheel/${wheelId}`);
        unsubscribeWheel = onSnapshot(wheelDocRef, (doc) => {
          if (doc.exists()) {
            setWheelOptions(doc.data().wheelItems);
            setRotation(doc.data().rotation);
            // timestamp sets null locally before getting from server
            // need to check before updating
            if (doc.data().latestSpinTime) {
              setLatestSpinTime(doc.data().latestSpinTime.toDate().getTime());
            }
          } else {
            // console.log("WHY IS THERE NO WHEEL DOC");
          }
        });
      }

      if (roomId) {
        const roomDocRef = doc(db, "rooms", roomId);
        unsubscribeRoom = onSnapshot(roomDocRef, (doc) => {
          if (doc.exists()) {
            setRoomName(doc.data().name);
            setPlayers(Object.keys(doc.data().players).sort());
          } else {
            // console.log("WHY IS THERE NO ROOM DOC");
          }
        });
      }
    };

    fetchWheelAndRoomListeners();

    const unload = (event: BeforeUnloadEvent) => {
      // only run on close and refresh
      setSessionItem("tabCount", `${Number(getSessionValue("tabCount")) - 1}`);

      if (Number(getSessionValue("tabCount")) < 1) {
        setRefreshCheck({ nickname: nickname, connection: connection });
        unloadSession();
        leaveRoom();
      }
      // console.log("unload");
    };
    window.addEventListener("beforeunload", unload);

    return () => {
      // console.log("leaving and cleaning up");
      unsubscribeWheel();
      unsubscribeRoom();
      window.removeEventListener("beforeunload", unload);
    };
  }, []);

  const newWheelSpin = async (newRotation: number) => {
    // console.log(`Spinning Wheel\nNew Rotation: ${newRotation}`);
    await updateDoc(
      doc(db, `rooms/${connectionIds[0]}/wheel/${connectionIds[1]}`),
      { latestSpinTime: serverTimestamp(), rotation: newRotation }
    );
  };

  useEffect(() => {
    const login = setTimeout(async () => {
      const roomDocRef = doc(db, "rooms", connectionIds[0]);

      // console.log(`making sure ${nickname} is logged in to room`);
      if (!players.includes(nickname)) {
        await updateDoc(roomDocRef, {
          [`players.${nickname}`]: serverTimestamp(),
        });
      }

      getSessionValue("tabCount")
        ? setSessionItem(
            "tabCount",
            `${Number(getSessionValue("tabCount")) + 1}`
          )
        : setSessionItem("tabCount", "1");
      // console.log(
      //   `${nickname} is logged in (${Number(getSessionValue("tabCount"))})`
      // );
    }, 500);

    const loginInterval = setInterval(async () => {
      if (connectionIds[0]) {
        const roomDocRef = doc(db, "rooms", connectionIds[0]);

        // console.log(`updating ${nickname}'s heartbeat time`);
        await updateDoc(roomDocRef, {
          [`players.${nickname}`]: serverTimestamp(),
        });

        const roomDoc = await getDoc(roomDocRef);

        if (!roomDoc.exists()) {
          // console.log("ERROR: roomDocData does not exist");
          return;
        }

        const roomPlayers = roomDoc.data().players;
        let deletePlayers: { [key: string]: FieldValue } = {};
        for (let player in roomPlayers) {
          if (roomPlayers[player] !== null) {
            let prevTimestamp = roomPlayers[player].toDate();
            if (Date.now() - prevTimestamp > 600000) {
              deletePlayers[`players.${player}`] = deleteField();
            }
          }
        }

        if (Object.keys(deletePlayers).length > 0) {
          // console.log(`deleting: ${deletePlayers}`);
          await setDoc(roomDocRef, deletePlayers, { merge: true });
        }
      } else {
        // console.log("WHY IS THERE NO ROOM DOC");
        return;
      }
    }, 300000);

    return () => {
      clearInterval(loginInterval);
      clearTimeout(login);
    };
  }, []);

  const handleItemChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (addItemModal) {
      setAddItemForm({
        ...addItemForm,
        [event.target.name]:
          event.target.name === "size"
            ? Number(event.target.value)
            : event.target.value,
      });
    } else {
      setEditItemForm({
        ...editItemForm,
        [event.target.name]:
          event.target.name === "size"
            ? Number(event.target.value)
            : event.target.value,
      });
    }
  };

  async function handleItemOnSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const wheelRef = doc(
      db,
      `rooms/${connectionIds[0]}/wheel/${connectionIds[1]}`
    );

    if (!addItemModal) {
      if (
        editItemForm.prevOptionName === editItemForm.optionName &&
        editItemForm.prevColor === editItemForm.color &&
        editItemForm.prevSize === editItemForm.size
      ) {
        // no items changed, do not update firestore
        return;
      }

      // console.log(`deleting wheel item: ${editItemForm.prevOptionName}`);
      await updateDoc(wheelRef, {
        wheelItems: arrayRemove({
          optionName: editItemForm.prevOptionName,
          color: editItemForm.prevColor,
          size: editItemForm.prevSize,
        }),
      });
    } else {
      if (addItemForm.optionName === "") {
        return;
      }
    }

    // console.log(
    //   `adding new wheel item: ${
    //     addItemModal ? addItemForm.optionName : editItemForm.optionName
    //   }`
    // );
    await updateDoc(wheelRef, {
      wheelItems: arrayUnion(
        addItemModal
          ? {
              optionName: addItemForm.optionName,
              color: addItemForm.color,
              size: addItemForm.size,
            }
          : {
              optionName: editItemForm.optionName,
              color: editItemForm.color,
              size: editItemForm.size,
            }
      ),
    });

    addItemModal
      ? setAddItemForm({
          optionName: "",
          color: "",
          size: 0,
        })
      : setEditItemForm({
          optionName: "",
          color: "",
          size: 0,
          prevOptionName: "",
          prevColor: "",
          prevSize: 0,
        });
    setAddItemModal(false);
    setIsItemModalOpen(false);
  }

  return (
    <div className="flex flex-col w-[95%] md:w-[750px] lg:w-[970px] xl:w-[1170px]">
      <h1
        className="text-white text-4xl font-medium mt-5 mb-3 cursor-pointer select-none hover:underline"
        onClick={() => {
          // console.log("clicking to leave room");
          clearRefreshCheck();
          leaveRoom();
        }}
      >
        WheelSpinnerSync
      </h1>

      <div className="flex flex-col lg:flex-row gap-x-8">
        <div className="basis-0 grow">
          <div className="text-white rounded-md border border-slate-950 flex flex-col box-border overflow-hidden mb-5">
            <h1 className="bg-gray-600 px-4 py-[10px] text-2xl border-b border-slate-950 text-center font-bold">
              {roomName ? roomName : ""}
            </h1>

            <div className="bg-gray-700 p-4 h-full flex flex-col justify-center items-center">
              <Wheel
                wheelOptions={wheelOptions}
                result={result}
                setResult={setResult}
                rotation={rotation}
                latestSpinTime={latestSpinTime}
                newWheelSpin={newWheelSpin}
              />
            </div>
          </div>
        </div>

        <div className="basis-0 grow lg:grow-[2]">
          <ContentBox title="Wheel Items">
            <div className="flex flex-col gap-1 w-full text-sm font-bold">
              <div className="rounded grid grid-cols-4 px-2 w-full content-evenly">
                <div className="col-span-1 flex items-center">Name</div>
                <div className="col-span-1 flex items-center">Size</div>
                <div className="col-span-1 flex items-center">Color</div>
                <div className="col-span-1 flex justify-end" />
              </div>
              {wheelOptions.map((option, index) => {
                return (
                  <div
                    className="rounded hover:bg-slate-600 grid grid-cols-4 gap-3 px-2 py-2 w-full content-evenly text-base font-normal"
                    key={`${option.optionName}${index}`}
                  >
                    <WheelOptionRow
                      optionName={option.optionName}
                      optionSize={option.size ? option.size : 1}
                      optionColor={option.color}
                      editOption={() => {
                        setEditItemForm({
                          optionName: option.optionName,
                          color: option.color,
                          size: option.size ? option.size : 0,
                          prevOptionName: option.optionName,
                          prevColor: option.color,
                          prevSize: option.size ? option.size : 0,
                        });
                        setAddItemModal(false);
                        setIsItemModalOpen(true);
                      }}
                      deleteOption={() => {
                        setDeleteItemForm({
                          optionName: option.optionName,
                          color: option.color,
                          size: option.size ? option.size : 0,
                        });
                        setIsDeleteItemModalOpen(true);
                      }}
                    />
                  </div>
                );
              })}

              <div
                className={`flex flex-row ${
                  wheelOptions.length === 0 ? "justify-between" : "justify-end"
                }`}
              >
                {wheelOptions.length === 0 ? (
                  <div className="px-2 py-2 font-normal">No Wheel Items</div>
                ) : (
                  <></>
                )}
                <button
                  className="hover:bg-slate-600 rounded px-2 py-2 mr-2"
                  title="Add Wheel Item"
                  onClick={() => {
                    setAddItemForm({
                      optionName: "",
                      color: "#1e293b",
                      size: 0,
                    });
                    setAddItemModal(true);
                    setIsItemModalOpen(true);
                  }}
                >
                  <FaPlus size={18} />
                </button>
              </div>
            </div>
          </ContentBox>
          <ContentBox title="Players">
            <div className="flex gap-4 flex-wrap">
              {players.map((player, index) => {
                return (
                  <div key={index} className="bg-slate-600 px-2 py-1 rounded">
                    {player}
                  </div>
                );
              })}
            </div>
          </ContentBox>
        </div>
      </div>

      {/* modal */}
      {isItemModalOpen && (
        <Modal
          isOpen={isItemModalOpen}
          onClose={() => {
            setAddItemForm({ optionName: "", color: "", size: 0 });
            setEditItemForm({
              optionName: "",
              color: "",
              size: 0,
              prevOptionName: "",
              prevColor: "",
              prevSize: 0,
            });
            setAddItemModal(true);
            setIsItemModalOpen(false);
          }}
          title={addItemModal ? "Add Wheel Item" : "Edit Wheel Item"}
        >
          <form onSubmit={handleItemOnSubmit} className="flex flex-col">
            <div className="flex flex-col mb-4">
              <label className="text-sm font-bold">Option Name</label>
              <input
                className="px-3 py-2 border border-slate-950 rounded h-9 outline-none text-black text-sm bg-[#e2e8f0]"
                type="text"
                name="optionName"
                value={
                  addItemModal
                    ? addItemForm.optionName
                    : editItemForm.optionName
                }
                onChange={handleItemChange}
                maxLength={255}
                required={true}
                placeholder={
                  addItemModal ? "Option Name" : editItemForm.prevOptionName
                }
              />
            </div>

            <div className="flex flex-col mb-4">
              <label className="text-sm font-bold">Color</label>
              <div className="flex flex-row px-3 py-2 justify-left content-center gap-4">
                <ColorRadioButton
                  label=""
                  value="#1e293b"
                  isChecked={
                    addItemModal
                      ? addItemForm.color === "#1e293b"
                      : editItemForm.color === "#1e293b"
                  }
                  handleChange={handleItemChange}
                />
                <ColorRadioButton
                  label=""
                  value="#334155"
                  isChecked={
                    addItemModal
                      ? addItemForm.color === "#334155"
                      : editItemForm.color === "#334155"
                  }
                  handleChange={handleItemChange}
                />
                <ColorRadioButton
                  label=""
                  value="#94a3b8"
                  isChecked={
                    addItemModal
                      ? addItemForm.color === "#94a3b8"
                      : editItemForm.color === "#94a3b8"
                  }
                  handleChange={handleItemChange}
                />
                <ColorRadioButton
                  label=""
                  value="#e2e8f0"
                  isChecked={
                    addItemModal
                      ? addItemForm.color === "#e2e8f0"
                      : editItemForm.color === "#e2e8f0"
                  }
                  handleChange={handleItemChange}
                />
              </div>
            </div>

            <div className="flex flex-col mb-4">
              <label className="text-sm font-bold">Size</label>
              <input
                className="px-3 py-2 border border-slate-950 rounded h-9 outline-none text-black text-sm bg-[#e2e8f0]"
                type="text"
                name="size"
                value={addItemModal ? addItemForm.size : editItemForm.size}
                onChange={handleItemChange}
                maxLength={255}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>

            <button
              type="submit"
              className="text-black bg-[#e2e8f0] border border-slate-950 m-0 px-3 py-2 rounded text-sm self-center"
            >
              {addItemModal ? "Add" : "Edit"}
            </button>
          </form>
        </Modal>
      )}
      {isDeleteItemModalOpen && (
        <Modal
          isOpen={isDeleteItemModalOpen}
          onClose={() => {
            setDeleteItemForm({
              optionName: "",
              color: "",
              size: 0,
            });
            setIsDeleteItemModalOpen(false);
          }}
          title={"Delete Wheel Item"}
        >
          <div className="flex flex-col mb-4">
            <div className="text-sm font-bold">Option Name</div>
            <div className="text-sm font-bold">{deleteItemForm.optionName}</div>
          </div>

          <div className="flex flex-col mb-4">
            <div className="text-sm font-bold">Color</div>
            <div className="text-sm font-bold">{deleteItemForm.color}</div>
          </div>

          <div className="flex flex-col mb-4">
            <div className="text-sm font-bold">size</div>
            <div className="text-sm font-bold">{deleteItemForm.size}</div>
          </div>

          <div className="w-full flex flex-row justify-around">
            <button
              className="text-black bg-[#e2e8f0] border border-slate-950 m-0 px-3 py-2 rounded text-sm"
              onClick={async () => {
                // console.log(`deleting item: ${deleteItemForm}`);
                await updateDoc(
                  doc(
                    db,
                    `rooms/${connectionIds[0]}/wheel/${connectionIds[1]}`
                  ),
                  {
                    wheelItems: arrayRemove(deleteItemForm),
                  }
                );
                setDeleteItemForm({
                  optionName: "",
                  color: "",
                  size: 0,
                });
                setIsDeleteItemModalOpen(false);
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
