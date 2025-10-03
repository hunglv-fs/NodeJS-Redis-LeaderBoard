CREATE DATABASE IF NOT EXISTS game_db;
USE game_db;

CREATE TABLE IF NOT EXISTS game_results (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  player_name VARCHAR(100) NOT NULL,
  score INT NOT NULL,
  duration_seconds INT NOT NULL,
  max_consecutive_presses INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
