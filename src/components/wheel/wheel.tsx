import { Dispatch, SetStateAction, useState, useRef, useEffect } from "react";

import styles from "./wheel.module.css";

type WheelOption = {
  optionName: string;
  color: string;
  size?: number;
};

interface WheelProps {
  wheelOptions: WheelOption[];
  result: string;
  setResult: Dispatch<SetStateAction<string>>;
  rotation: number;
  latestSpinTime: Date | null;
  newWheelSpin: (newRotation: number) => Promise<void>;
}

export default function Wheel({
  wheelOptions,
  result,
  setResult,
  rotation,
  latestSpinTime,
  newWheelSpin,
}: WheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [previousSpinTime, setPreviousSpinTime] = useState(latestSpinTime);
  const [currentRotation, setCurrentRotation] = useState(rotation);
  const [totalSize, setTotalSize] = useState(0);
  const wheelRef = useRef(null);

  useEffect(() => {
    setTotalSize(
      wheelOptions.reduce((acc, option) => acc + Number(option.size || 1), 0)
    );
  }, [wheelOptions]);

  function getCoordinatesForPercent(
    percent: number,
    radius: number,
    circleX: number,
    circleY: number
  ) {
    const x = radius * Math.cos(2 * Math.PI * percent) + circleX;
    const y = radius * Math.sin(2 * Math.PI * percent) + circleY;

    return [x, y];
  }

  const generatePath = (index: number) => {
    const cumulativeSize = wheelOptions
      .slice(0, index)
      .reduce((acc, segment) => acc + (segment.size || 1), 0);
    const segmentSize = wheelOptions[index].size || 1;

    const [radius, circleX, circleY] = [200, 200, 200];
    const largeArcFlag = segmentSize / totalSize > 0.5 ? 1 : 0;

    const [startX, startY] = getCoordinatesForPercent(
      cumulativeSize / totalSize,
      radius,
      circleX,
      circleY
    );
    const [endX, endY] = getCoordinatesForPercent(
      (cumulativeSize + segmentSize) / totalSize,
      radius,
      circleX,
      circleY
    );
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} L ${circleX} ${circleY}`;
  };

  const generateTextPath = (index: number) => {
    const cumulativeSize = wheelOptions
      .slice(0, index)
      .reduce((acc, segment) => acc + (segment.size || 1), 0);
    const segmentSize = wheelOptions[index].size || 1;

    const [radius, circleX, circleY] = [170, 200, 200];
    const largeArcFlag = segmentSize / totalSize > 0.5 ? 1 : 0;

    const [startX, startY] = getCoordinatesForPercent(
      cumulativeSize / totalSize,
      radius,
      circleX,
      circleY
    );
    const [endX, endY] = getCoordinatesForPercent(
      (cumulativeSize + segmentSize) / totalSize,
      radius,
      circleX,
      circleY
    );
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  const clipText = (text: string, maxLength: number) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const handleSpin = () => {
    if (!wheelRef.current || latestSpinTime === previousSpinTime) return;

    setSpinning(true);
    setResult("");

    const spins = 10;
    const finalRotation = spins * 360 + rotation;

    const stopAngle = (rotation + 90) % 360;
    let selectedSegmentIndex = 0;
    let cumulativeAngle = 0;

    for (let i = wheelOptions.length - 1; i >= 0; i--) {
      const segmentAngle = (wheelOptions[i].size || 1) * (360 / totalSize);
      // console.log(`segmentAngle: ${segmentAngle}\nstopAngle: ${stopAngle}`);
      cumulativeAngle += segmentAngle;
      if (stopAngle <= cumulativeAngle) {
        selectedSegmentIndex = i;
        break;
      }
    }

    setCurrentRotation(finalRotation);

    setTimeout(() => {
      setPreviousSpinTime(latestSpinTime);
      setResult(wheelOptions[selectedSegmentIndex].optionName);
      setSpinning(false);
      setCurrentRotation(rotation);
    }, 2000);
  };

  useEffect(() => {
    // console.log({
    //   length: wheelOptions.length,
    //   previousSpinTime: previousSpinTime,
    //   latestSpinTime: latestSpinTime,
    //   currentRotation: currentRotation,
    //   rotation: rotation,
    //   compared: latestSpinTime === previousSpinTime,
    // });
    if (
      wheelOptions.length > 0 &&
      previousSpinTime !== null &&
      latestSpinTime !== previousSpinTime
    ) {
      handleSpin();
    } else if (rotation !== 0 && currentRotation === 0) {
      setCurrentRotation(rotation);
    }
  }, [latestSpinTime]);

  const startNewSpin = () => {
    setPreviousSpinTime(latestSpinTime);

    let randomAngle = Math.random() * 360;
    randomAngle = Math.trunc(randomAngle * 1000) / 1000;
    // console.log(`new spin: ${randomAngle}`);

    newWheelSpin(randomAngle);
  };

  return (
    <div className={styles.wheelContainer}>
      <svg
        width="400px"
        height="400px"
        viewBox="0 0 400 400"
        ref={wheelRef}
        style={{
          transform: `rotate(${currentRotation}deg)`,
          transition: `transform ${
            spinning ? "2s cubic-bezier(0.33, 1, 0.68, 1)" : "0ms"
          }`,
        }}
      >
        {wheelOptions.length > 1 ? (
          wheelOptions.map((segment, index) => {
            const clippedText = clipText(segment.optionName, 10);
            const fontSize = Math.min(
              14,
              (wheelOptions[index].size || 1) * (14 / totalSize) * 20
            );

            return (
              <g key={segment.optionName + index}>
                <path
                  d={generatePath(index)}
                  fill={segment.color}
                  stroke="#333"
                  strokeWidth="2"
                />
                <path
                  id={`textPath-${index}`}
                  d={generateTextPath(index)}
                  fill="none"
                  stroke="none"
                />
                <text
                  fill={
                    segment.color === "#94a3b8" || segment.color === "#e2e8f0"
                      ? "#000"
                      : "#fff"
                  }
                  fontSize={fontSize}
                  textAnchor="middle"
                >
                  <textPath href={`#textPath-${index}`} startOffset="50%">
                    {clippedText}
                  </textPath>
                </text>
              </g>
            );
          })
        ) : (
          <g>
            <circle
              cx={200}
              cy={200}
              r={200}
              fill={
                wheelOptions.length === 1 ? wheelOptions[0].color : "#e2e8f0"
              }
              stroke="#333"
              strokeWidth="2"
            />
            {wheelOptions.length === 1 ? (
              <>
                <path
                  id="textPath"
                  d="M 370 200 A 170 170 0 1 1 30 200 A 1 1 0 1 1 370 200"
                  fill="none"
                  stroke="none"
                />
                <text
                  fill={
                    wheelOptions[0].color === "#94a3b8" ||
                    wheelOptions[0].color === "#e2e8f0"
                      ? "#000"
                      : "#fff"
                  }
                  fontSize={20}
                  textAnchor="middle"
                >
                  <textPath href="#textPath" startOffset="50%">
                    {clipText(wheelOptions[0].optionName, 10)}
                  </textPath>
                </text>
              </>
            ) : (
              <></>
            )}
          </g>
        )}
        <circle cx={200} cy={200} r={150} fill="#374151" />
      </svg>

      <svg className={styles.wheelPointer} height={30} width={40}>
        <polygon
          points="20,30 40,0 0,0"
          fill="#e2e8f0"
          stroke="#333"
          strokeWidth="2"
        />
      </svg>

      <div className={styles.wheelCenter}>
        <div className={styles.wheelResult}>{result}</div>
        <button
          className={styles.wheelButton}
          onClick={() => {
            if (!spinning && wheelOptions.length !== 0) {
              setSpinning(true);
              startNewSpin();
            }
          }}
          disabled={spinning || wheelOptions.length === 0}
        >
          {wheelOptions.length === 0
            ? "Add items to spin"
            : spinning
            ? "Spinning..."
            : "Spin"}
        </button>
      </div>
    </div>
  );
}
