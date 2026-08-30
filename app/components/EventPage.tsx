"use client";

import { Card } from "antd";
import { type FC } from "react";

import Datetime from "./Datetime";

type EventPageProps = {
  event: {
    id: bigint;
    title: string;
    description: string;
    lockAt: Date;
    choices: {
      id: bigint;
      title: string;
      lastPrice: number | null;
    }[];
    createBy: {
      id: bigint;
      username: string;
    };
    createdAt: Date;
  };
};

export const EventPage: FC<EventPageProps> = ({ event }) => {
  return (
    <>
      <h1>{event.title}</h1>
      <div>
        创建于：
        <Datetime date={event.createdAt} />
      </div>
      <div>
        截止时间：
        <Datetime date={event.lockAt} />
      </div>
      <div>创建者：{event.createBy.username}</div>
      <div>
        <h2>选项</h2>
        {event.choices.map((choice) => (
          <Card key={choice.id} title={choice.title}>
            上次成交价：{choice.lastPrice !== null ? choice.lastPrice : "--"}
          </Card>
        ))}
      </div>
      <div>描述：{event.description}</div>
    </>
  );
};

export default EventPage;
