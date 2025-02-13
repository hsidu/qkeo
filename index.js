import OpenAI from "openai";

const openai = new OpenAI();

let chatHistory = [{ role: "system", content: "You are a helpful assistant." }];

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case "POST":
      if (req.query.endpoint === "chat") {
        // إضافة رسالة المستخدم إلى السجل
        const content = req.body.message;
        chatHistory.push({ role: "user", content });

        // استدعاء OpenAI API للحصول على الرد
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: chatHistory,
          });

          const botResponse = completion.choices[0]?.message?.content || "Error: No response";
          chatHistory.push({ role: "assistant", content: botResponse });

          res.status(200).json({ success: true, response: botResponse });
        } catch (error) {
          res.status(500).json({ success: false, error: "Failed to generate response" });
        }
      } else if (req.query.endpoint === "reset") {
        // إعادة تعيين سجل الدردشة
        chatHistory = [{ role: "system", content: "You are a helpful assistant." }];
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ error: "Not Found" });
      }
      break;

    case "GET":
      if (req.query.endpoint === "history") {
        res.status(200).json(chatHistory);
      } else if (req.query.endpoint === "stream") {
        // إعداد SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        try {
          const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: chatHistory,
            stream: true,
          });

          for await (const chunk of stream) {
            const message = chunk.choices[0]?.delta?.content || "";
            res.write(`data: ${JSON.stringify(message)}\n\n`);
          }

          chatHistory.push({ role: "assistant", content: message });
        } catch (error) {
          res.write(`event: error\ndata: ${JSON.stringify({ message: "Stream error" })}\n\n`);
        }

        return new Promise((resolve) => {
          req.on("close", () => resolve());
        });
      } else {
        res.status(404).json({ error: "Not Found" });
      }
      break;

    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
