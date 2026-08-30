import dayjs from "dayjs";
import { useLayoutEffect, useState, type FC } from "react";

const Datetime: FC<{ date: Parameters<typeof dayjs>[0] }> = ({ date }) => {
  const obj = dayjs(date);
  const [str, setStr] = useState(obj.format("YYYY-MM-DD HH:mm:ss[!+00:00]"));
  useLayoutEffect(() => {
    setStr(obj.format("YYYY-MM-DD HH:mm:ss[!]Z"));
  }, [obj.toISOString()]);
  return (
    <time
      dateTime={obj.toISOString()}
      title={obj.toISOString()}
      suppressHydrationWarning
    >
      {str.split("!")[0]}
      <sup>UTC{str.split("!")[1]}</sup>
    </time>
  );
};

export default Datetime;
