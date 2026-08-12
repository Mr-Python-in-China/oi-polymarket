import dayjs from "dayjs";
import type { FC } from "react";

const Datetime: FC<{ date: Parameters<typeof dayjs>[0] }> = ({ date }) => {
  const obj = dayjs(date);
  return (
    <time dateTime={obj.toISOString()} title={obj.toISOString()}>
      {obj.format("YYYY-MM-DD HH:mm:ss")}
      <sup>UTC{obj.format("Z")}</sup>
    </time>
  );
};

export default Datetime;
