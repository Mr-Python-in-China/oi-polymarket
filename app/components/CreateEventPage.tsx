"use client";

import {
  faCalendarDays,
  faCircleMinus,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert, App, Button, DatePicker, Form, Input, Space } from "antd";
import dayjs from "dayjs";
import { useState, type FC } from "react";

import createEvent from "~/functions/createEvent";

const CreateEventPage: FC<{}> = () => {
  const { message } = App.useApp();
  const [isPending, setIsPending] = useState(false);
  async function handleSubmit(values: unknown) {
    setIsPending(true);
    try {
      await createEvent(values);
      message.success("创建成功");
    } catch (error) {
      message.error("创建失败");
      console.error("Failed to create event:", error);
    } finally {
      setIsPending(false);
    }
  }
  return (
    <>
      <Alert
        title="警告"
        description="创建后将只允许更改标题、描述和选项，你应该在提交前仔细核对！"
        type="warning"
      />
      <Form onFinish={handleSubmit}>
        <Form.Item label="标题" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="描述" name="description" rules={[{ required: true }]}>
          <Input.TextArea />
        </Form.Item>
        <Form.Item
          label="锁定时间"
          name="lockAt"
          rules={[{ required: true }]}
          getValueProps={(value) => ({ value: value && dayjs(value) })}
          normalize={(value) => value && `${dayjs(value).toISOString()}`}
        >
          <DatePicker
            showTime
            suffixIcon={<FontAwesomeIcon icon={faCalendarDays} />}
          />
        </Form.Item>
        <Form.List
          name="choices"
          rules={[
            {
              validator: async (_, value?: unknown[]) => {
                if (!value || value.length < 2)
                  throw new Error("至少需要两个选项");
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  style={{ display: "flex", marginBottom: 8 }}
                  align="baseline"
                >
                  <Form.Item
                    {...restField}
                    name={[name, "title"]}
                    rules={[{ required: true }]}
                    label={`选项 ${name + 1}`}
                  >
                    <Input />
                  </Form.Item>
                  <Button
                    type="text"
                    icon={<FontAwesomeIcon icon={faCircleMinus} />}
                    onClick={() => remove(name)}
                  />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<FontAwesomeIcon icon={faPlus} />}
                >
                  添加选项
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isPending}>
            提交
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default CreateEventPage;
