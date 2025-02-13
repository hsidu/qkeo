import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config(); // ✅ تحميل متغيرات البيئة

const app = express();
app.use(express.json()); // ✅ دعم JSON في الطلبات

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // ✅ مفتاح OpenAI
});

let chatHistory = [{ role: "system", content: "You are a helpful assistant." }];

// ✅ استقبال الرسائل وحفظها
app.post("/chat", (req, res) => {
  const content = req.body.message;
  chatHistory.push({ role: "user", content: content });
  res.status(200).json({ success: true });
});

// ✅ إعادة ضبط السجل
app.post("/reset", (req, res) => {
  chatHistory = [{ role: "system", content: "You are a helpful assistant." }];
  res.status(200).json({ success: true });
});

// ✅ عرض سجل المحادثة
app.get("/history", (req, res) => {
  res.status(200).json(chatHistory);
});

// ✅ بث مباشر للردود
app.get("/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.beta.chat.completions.stream({
      model: "gpt-3.5-turbo",
      messages: chatHistory,
      stream: true,
    });

    for await (const chunk of stream) {
      const message = chunk.choices[0]?.delta?.content || "";
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    }

    res.end();
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: "Stream encountered an error" })}\n\n`);
    res.end();
  }

  req.on("close", () => {
    res.end();
  });
});

// ✅ تشغيل السيرفر على المنفذ الصحيح
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
