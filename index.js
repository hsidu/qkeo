import express from "express";
import OpenAI from "openai";
import cors from "cors"; // للسماح بطلبات من متصفحات أخرى

const app = express();
const openai = new OpenAI();

app.use(express.json());
app.use(cors()); // تفادي مشاكل CORS

let chatHistory = [{ role: "system", content: "You are a helpful assistant." }];

// معالجة الطلبات إلى /chat
app.post("/chat", async (req, res) => {
  const content = req.body.message;
  chatHistory.push({ role: "user", content });

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
});

// إعادة ضبط المحادثة
app.post("/reset", (req, res) => {
  chatHistory = [{ role: "system", content: "You are a helpful assistant." }];
  res.status(200).json({ success: true });
});

// الحصول على السجل
app.get("/history", (req, res) => {
  res.status(200).json(chatHistory);
});

// بث الردود باستخدام SSE
app.get("/stream", async (req, res) => {
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

  req.on("close", () => res.end());
});

// تشغيل السيرفر على المنفذ المطلوب من Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
