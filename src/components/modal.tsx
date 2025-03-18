import { ReactNode, useState, useRef, useEffect } from "react";
import { IoClose } from "react-icons/io5";

interface ModalProps {
  isOpen: Boolean;
  onClose?: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  const [isModalOpen, setModalOpen] = useState(isOpen);
  const modalRef = useRef<HTMLDialogElement | null>(null);

  const handleCloseModal = () => {
    if (onClose) {
      onClose();
    }
    setModalOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") {
      handleCloseModal();
    }
  };

  useEffect(() => {
    setModalOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    const modalElement = modalRef.current;

    if (modalElement) {
      if (isModalOpen) {
        modalElement.showModal();
      } else {
        modalElement.close();
      }
    }
  });

  return (
    <dialog
      ref={modalRef}
      onKeyDown={handleKeyDown}
      className="text-white rounded-xl border border-slate-950 flex flex-col box-border bg-slate-700 w-96 h-1/2 backdrop:bg-black/50"
    >
      <h1 className="bg-gray-600 px-4 py-[10px] text-sm border-b border-slate-950 flex flex-row justify-between items-center">
        <div>{title}</div>
        <button
          className="bg-gray-600 border-none m-0 p-1 hover:bg-gray-500 rounded-full"
          onClick={handleCloseModal}
        >
          <IoClose size={18} />
        </button>
      </h1>
      <div className="bg-gray-700 p-4 h-full">{children}</div>
    </dialog>
  );
}
