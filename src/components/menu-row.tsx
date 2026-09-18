import type { ComponentProps } from "react";
import { UiIcon } from "./ui-icon";

export function MenuRow({
  icon,
  title,
  description,
}: {
  icon: ComponentProps<typeof UiIcon>["name"];
  title: string;
  description: string;
}) {
  return (
    <>
      <span className="menu-row-icon">
        <UiIcon name={icon} size={22} />
      </span>
      <span className="menu-row-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="menu-row-chevron">
        <UiIcon name="chevron" size={16} />
      </span>
    </>
  );
}
