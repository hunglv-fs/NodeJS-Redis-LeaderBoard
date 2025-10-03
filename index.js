const express = require("express");
const mysql = require("mysql2/promise");
const Redis = require("ioredis");

const app = express();
const PORT = 3000;

// Kết nối MySQL (dùng biến môi trường từ docker-compose)
console.log("Connecting to MySQL at:", process.env.MYSQL_HOST, process.env.MYSQL_USER, process.env.MYSQL_DATABASE, process.env.MYSQL_PASSWORD);
const db = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "password",
  database: process.env.MYSQL_DATABASE || "game_db"
});

// Kết nối Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379,
});

// Khởi tạo players
let players = [
  { id: 1, name: "Player 1", score: 0, clicks: 0, time: 0, gameOver: false },
  { id: 2, name: "Player 2", score: 0, clicks: 0, time: 0, gameOver: false },
];

let gameLoop;

// Giả lập tăng điểm
async function simulateGame() {
  players.forEach((p) => {
    if (!p.gameOver) {
      p.score += Math.floor(Math.random() * 10);
      p.clicks += 1;
      p.time += 1;

      if (p.score >= 10) {
        p.gameOver = true;
        console.log(`${p.name} GAME OVER at score ${p.score}`);
      }
    }
  });

  // Cập nhật vào Redis
  await redis.set("players", JSON.stringify(players));

  console.log(players);

  // Nếu cả 2 player game over thì dừng
  if (players.every((p) => p.gameOver)) {
    console.log("Cả 2 player đã game over → Dừng game");
    clearInterval(gameLoop);
    saveScores();
  }
}

// Lưu điểm số từ Redis vào MySQL
async function saveScores() {
  try {
    const data = await redis.get("players");
    const finalPlayers = JSON.parse(data);

    for (let p of finalPlayers) {
      await db.query(
        "INSERT INTO game_results (player_name, score, duration_seconds, max_consecutive_presses) VALUES (?, ?, ?, ?)",
        [p.name, p.score, p.time, p.clicks]
      );
    }
    console.log("✅ Đã lưu điểm số vào MySQL từ Redis");
  } catch (err) {
    console.error("❌ Lỗi khi lưu điểm:", err);
  }
}

// API hiển thị điểm số hiện tại (từ Redis)
app.get("/score", async (req, res) => {
  const data = await redis.get("players");
  if (data) {
    res.json(JSON.parse(data));
  } else {
    res.json(players);
  }
});

// Khởi động server và game
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);

  // Bắt đầu game loop mỗi giây
  gameLoop = setInterval(simulateGame, 1000);

  // Sau 2 phút (120 giây) thì dừng và lưu
  setTimeout(() => {
    console.log("⏰ Hết 2 phút → Ghi điểm vào DB");
    clearInterval(gameLoop);
    saveScores();
  }, 120000);
});
