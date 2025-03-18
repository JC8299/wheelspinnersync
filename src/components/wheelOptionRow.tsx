import { useRef, useState } from "react";
import { AiOutlineDelete } from "react-icons/ai";
import { MdOutlineModeEdit } from "react-icons/md";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

import { useIsOverflow } from "../util";

interface WheelOptionRowProps {
  optionName: string;
  optionSize: number;
  optionColor: string;
  editOption: () => void;
  deleteOption: () => void;
}

export default function WheelOptionRow({
  optionName,
  optionSize,
  optionColor,
  editOption,
  deleteOption,
}: WheelOptionRowProps) {
  const optionNameRef = useRef<HTMLDivElement>(null);
  const optionSizeRef = useRef<HTMLDivElement>(null);
  const [expand, setExpand] = useState(false);
  const [optionNameOverflow, setOptionNameOverflow] = useState(false);
  const [optionSizeOverflow, setOptionSizeOverflow] = useState(false);

  const isOptionNameOverflow = useIsOverflow(
    optionNameRef,
    (isOverflowFromCallback) => {
      setOptionNameOverflow(isOverflowFromCallback);
    }
  );
  const isOptionSizeOverflow = useIsOverflow(
    optionSizeRef,
    (isOverflowFromCallback) => {
      setOptionSizeOverflow(isOverflowFromCallback);
    }
  );

  // console.log({
  //   optionName: optionName,
  //   optionSize: optionSize,
  //   optionNameOverflow: optionNameOverflow,
  //   expand: expand,
  // });

  return (
    <div className={`grid grid-cols-4 col-span-4 items-center gap-2`}>
      <p
        className={`col-span-1 whitespace-nowrap overflow-hidden ${
          optionNameOverflow && "text-ellipsis"
        } ${expand && "text-wrap break-words"}`}
        ref={optionNameRef}
      >
        {optionName}
      </p>
      <p
        className={`col-span-1 whitespace-nowrap overflow-hidden ${
          optionSizeOverflow && "text-ellipsis"
        } ${expand && "text-wrap break-words"}`}
      >
        {optionSize}
      </p>
      <div
        className="col-span-1 h-full rounded-md"
        style={{ backgroundColor: optionColor, border: "2px solid #64748b" }}
      />
      <div className="col-span-1 flex justify-end">
        {(optionNameOverflow || optionSizeOverflow || expand) && (
          <button
            className="hover:bg-slate-500 rounded p-2 text-center cursor-pointer bg-transparent"
            title="Expand"
            onClick={() => {
              setExpand(!expand);
            }}
          >
            {expand ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
          </button>
        )}
        <button
          className="hover:bg-slate-500 rounded p-2"
          title="Edit"
          onClick={() => {
            editOption();
          }}
        >
          <MdOutlineModeEdit size={18} />
        </button>
        <button
          className="hover:bg-slate-500 rounded p-2"
          title="Delete"
          onClick={() => {
            deleteOption();
          }}
        >
          <AiOutlineDelete size={18} />
        </button>
      </div>
    </div>
  );
}
