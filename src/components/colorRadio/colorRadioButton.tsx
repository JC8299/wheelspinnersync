import { ChangeEvent } from "react";
import styles from "./colorRadioButton.module.css";

interface ColorRadioButtonProps {
  label: string;
  value: string;
  isChecked: boolean;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export default function ColorRadioButton({
  label,
  value,
  isChecked,
  handleChange,
}: ColorRadioButtonProps) {
  return (
    <label htmlFor={value} className={styles.radioLabel}>
      <input
        className={styles.radioInput}
        type="radio"
        id={value}
        value={value}
        name={"color"}
        checked={isChecked}
        onChange={handleChange}
      />
      <span className={styles.customRadio} style={{ background: value }} />
      {label}
    </label>
  );
}
