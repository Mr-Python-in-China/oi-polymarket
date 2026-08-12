"use client";

import { App, Button } from "antd";
import { useState, type FC } from "react";
import { Link } from "react-router";

import listEvents from "~/functions/listEvents";

import Datetime from "./Datetime";

const IndexPage: FC<{
  initialEvents: Awaited<ReturnType<typeof listEvents>>;
}> = ({ initialEvents }) => {
  const { message } = App.useApp();
  const [events, setEvents] = useState(initialEvents);
  const [noMoreEvents, setNoMoreEvents] = useState(false);
  async function loadMore() {
    try {
      const lastId = events.at(-1)?.id;
      const newEvents = await listEvents(lastId);
      if (newEvents.length === 0) setNoMoreEvents(true);
      else setEvents((x) => [...x, ...newEvents]);
    } catch (err) {
      message.error("加载失败");
      console.error("Failed to load more events:", err);
    }
  }
  return (
    <>
      {events.map((x) => (
        <div key={x.id}>
          <Link to={`/event/${x.id}`}>{x.title}</Link>
          <div>
            锁定时间：
            <Datetime date={x.lockAt} />
          </div>
          {x.choices.map((y) => (
            <div key={y.title}>
              {y.title}：{y.lastPrice !== null ? y.lastPrice / 10 : "--"}%
            </div>
          ))}
        </div>
      ))}
      {noMoreEvents ? (
        <div>没有更多了</div>
      ) : (
        <Button onClick={loadMore} type="primary">
          加载更多
        </Button>
      )}
    </>
  );
};

export default IndexPage;
