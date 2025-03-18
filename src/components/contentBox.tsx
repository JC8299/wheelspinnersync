interface ContentBoxProps {
  title: string;
  children?: React.ReactNode;
}

export default function ContentBox({ title, children }: ContentBoxProps) {
  return (
    <div className="text-white rounded-md border border-slate-950 flex flex-col box-border overflow-hidden mb-5">
      <h1 className="bg-gray-600 px-4 py-[10px] text-sm border-b border-slate-950">
        {title}
      </h1>
      <div className="bg-gray-700 p-4 h-full">{children}</div>
    </div>
  );
}
