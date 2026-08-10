"use client";

import { Button, App } from "antd";
import type { FC } from "react";
import {
  useLinkClickHandler,
  useNavigate,
  useSearchParams,
} from "react-router";

import confirmRegister from "~/functions/confirmRegister";

const RegisterConfirmationPage: FC<{
  codeforcesHandle: string;
  codeforcesRating: number;
  initialMedal: number;
}> = ({ codeforcesHandle, codeforcesRating, initialMedal }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toLoginPage = useLinkClickHandler("/login");
  const { message } = App.useApp();
  const onConfirm = async () => {
    try {
      await confirmRegister();
      navigate(searchParams.get("to") ?? "/");
    } catch (e) {
      message.error("注册失败");
      console.error("Failed to confirm register", e);
    }
  };
  return (
    <div>
      <h1>确认注册</h1>
      <p>Codeforces 用户名: {codeforcesHandle}</p>
      <p>Rating: {codeforcesRating}</p>
      <p>初始金牌数: {initialMedal}</p>
      <p>
        金牌是该网站的虚拟货币。你的初始金牌数与你的 Codeforces Rating
        相关。你确定要注册吗？
      </p>
      <Button type="primary" onClick={onConfirm}>
        确认
      </Button>
      <Button onClick={toLoginPage}>取消</Button>
    </div>
  );
};

export default RegisterConfirmationPage;
