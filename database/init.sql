-- ============================================================================
-- Cinema & Event Booking System Database Schema & Seed Data (MySQL 8.0)
-- Phase 2: Complete Database Implementation
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `cinema_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cinema_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. Table: users
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table: categories
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('movie', 'event') NOT NULL DEFAULT 'movie',
  `description` VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table: movies_events
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `movies_events`;
CREATE TABLE `movies_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `duration_minutes` INT NOT NULL,
  `release_date` DATE NOT NULL,
  `poster_url` VARCHAR(255) DEFAULT NULL,
  `trailer_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('now_showing', 'coming_soon', 'ended') NOT NULL DEFAULT 'now_showing',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_movie_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Table: cinemas
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `cinemas`;
CREATE TABLE `cinemas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Table: halls
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `halls`;
CREATE TABLE `halls` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cinema_id` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `total_rows` INT NOT NULL DEFAULT 8,
  `total_cols` INT NOT NULL DEFAULT 12,
  `type` ENUM('2D', '3D', 'IMAX', 'VIP') NOT NULL DEFAULT '2D',
  CONSTRAINT `fk_hall_cinema` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Table: seats
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `seats`;
CREATE TABLE `seats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hall_id` INT NOT NULL,
  `seat_row` VARCHAR(5) NOT NULL,
  `seat_number` INT NOT NULL,
  `seat_type` ENUM('standard', 'vip', 'couple') NOT NULL DEFAULT 'standard',
  `status` ENUM('active', 'maintenance') NOT NULL DEFAULT 'active',
  UNIQUE KEY `unique_hall_seat` (`hall_id`, `seat_row`, `seat_number`),
  CONSTRAINT `fk_seat_hall` FOREIGN KEY (`hall_id`) REFERENCES `halls` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Table: showtimes
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `showtimes`;
CREATE TABLE `showtimes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `movie_event_id` INT NOT NULL,
  `hall_id` INT NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `price_standard` DECIMAL(10,2) NOT NULL DEFAULT 70000.00,
  `price_vip` DECIMAL(10,2) NOT NULL DEFAULT 90000.00,
  `price_couple` DECIMAL(10,2) NOT NULL DEFAULT 150000.00,
  `status` ENUM('scheduled', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  INDEX `idx_movie_showtime` (`movie_event_id`, `start_time`),
  CONSTRAINT `fk_showtime_movie` FOREIGN KEY (`movie_event_id`) REFERENCES `movies_events` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_showtime_hall` FOREIGN KEY (`hall_id`) REFERENCES `halls` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Table: seat_locks (Cơ chế giữ ghế tạm thời TTL 5 phút)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `seat_locks`;
CREATE TABLE `seat_locks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `showtime_id` INT NOT NULL,
  `seat_id` INT NOT NULL,
  `session_id` VARCHAR(100) NOT NULL,
  `locked_until` TIMESTAMP NOT NULL,
  UNIQUE KEY `unique_seat_lock` (`showtime_id`, `seat_id`),
  CONSTRAINT `fk_lock_showtime` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_lock_seat` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Table: bookings
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `booking_code` VARCHAR(32) NOT NULL UNIQUE,
  `showtime_id` INT NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_email` VARCHAR(100) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `payment_status` ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  `payment_method` VARCHAR(50) DEFAULT 'mock_vnpay',
  `qr_code` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_booking_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_showtime` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Table: booking_seats (TRỌNG YẾU: Ngăn chặn tuyệt đối Double Booking)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `booking_seats`;
CREATE TABLE `booking_seats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL,
  `showtime_id` INT NOT NULL,
  `seat_id` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  UNIQUE KEY `unique_showtime_seat` (`showtime_id`, `seat_id`),
  CONSTRAINT `fk_bs_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bs_showtime` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bs_seat` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED DATA (Dữ liệu thực tế cho kiểm thử)
-- ============================================================================

-- 1. Seed Users (Mật khẩu được băm Bcrypt 10 rounds)
-- admin: admin123 ($2b$10$9VoPGc.oPsSVOPonpoC.7.k9Ru1YsyTP5Ea4Gr4lmdPQ9nm0povIO)
-- user: user123 ($2b$10$9aYtKDCYdgO.5//DKsxnP.neFJeYN71a/wF2oXJ2O28GxiXdRLVFu)
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `phone`, `role`) VALUES
(1, 'admin', 'admin@cinewave.vn', '$2b$10$9VoPGc.oPsSVOPonpoC.7.k9Ru1YsyTP5Ea4Gr4lmdPQ9nm0povIO', 'Quản Trị Viên Hệ Thống', '0988888888', 'admin'),
(2, 'nguyenvanan', 'an.nguyen@example.com', '$2b$10$9aYtKDCYdgO.5//DKsxnP.neFJeYN71a/wF2oXJ2O28GxiXdRLVFu', 'Nguyễn Văn An', '0901234567', 'user'),
(3, 'tranthibich', 'bich.tran@example.com', '$2b$10$9aYtKDCYdgO.5//DKsxnP.neFJeYN71a/wF2oXJ2O28GxiXdRLVFu', 'Trần Thị Bích', '0912345678', 'user');

-- 2. Seed Categories
INSERT INTO `categories` (`id`, `name`, `type`, `description`) VALUES
(1, 'Hành Động & Khoa Học Viễn Tưởng', 'movie', 'Phim bom tấn Hollywood kịch tính, kỹ xảo đỉnh cao'),
(2, 'Hoạt Hình & Phiêu Lưu Gia Đình', 'movie', 'Phim hoạt hình 3D lồng tiếng phù hợp mọi lứa tuổi'),
(3, 'Live Concert & Sự Kiện Âm Nhạc', 'event', 'Đại nhạc hội, liveshow ca nhạc quốc tế và trong nước'),
(4, 'Kinh Dị & Tâm Lý Bí Ẩn', 'movie', 'Phim kinh dị rùng rợn, giật gân hồi hộp');

-- 3. Seed Movies & Events
INSERT INTO `movies_events` (`id`, `category_id`, `title`, `description`, `duration_minutes`, `release_date`, `poster_url`, `trailer_url`, `status`) VALUES
(1, 1, 'Dune: Hành Tinh Cát - Phần Hai', 'Paul Atreides hội ngộ cùng Chani và tộc người Fremen để tìm kiếm sự trả thù cho gia tộc của mình.', 166, '2024-03-01', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600', 'https://www.youtube.com/watch?v=Way9Dexny3w', 'now_showing'),
(2, 2, 'Kung Fu Panda 4', 'Gấu Po trở lại trong hành trình mới để tìm kiếm người kế vị danh hiệu Thần Long Đại Hiệp.', 94, '2024-03-08', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600', 'https://www.youtube.com/watch?v=_inKs4eeHiI', 'now_showing'),
(3, 4, 'Exhuma: Quật Mộ Trùng Ma', 'Câu chuyện ma mị về nhóm pháp sư khai quật ngôi mộ cổ bí ẩn tại Hàn Quốc gặp phải thế lực tà ác.', 134, '2024-03-15', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600', 'https://www.youtube.com/watch?v=xZ_g4UeI_44', 'now_showing'),
(4, 3, 'Live Concert: Giai Điệu Ánh Sao CineWave', 'Đêm nhạc acoustic và giao hưởng sống động tại rạp chiếu phim với dàn nhạc chuyên nghiệp.', 120, '2026-10-20', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600', 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ', 'coming_soon');

-- 4. Seed Cinemas
INSERT INTO `cinemas` (`id`, `name`, `address`, `city`, `phone`) VALUES
(1, 'CineWave Landmark 81', '720A Điện Biên Phủ, Phường 22, Q. Bình Thạnh', 'TP. Hồ Chí Minh', '02873001234'),
(2, 'CineWave Vincom Bà Triệu', '191 Bà Triệu, Phường Lê Đại Hành, Q. Hai Bà Trưng', 'Hà Nội', '02473005678');

-- 5. Seed Halls
INSERT INTO `halls` (`id`, `cinema_id`, `name`, `total_rows`, `total_cols`, `type`) VALUES
(1, 1, 'Phòng 01 - Laser 2D', 5, 8, '2D'),
(2, 1, 'Phòng 02 - IMAX with Laser', 6, 10, 'IMAX'),
(3, 2, 'Phòng VIP Premier', 4, 6, 'VIP');

-- 6. Seed Seats
-- Hall 1: 5 hàng (A-E), 8 cột = 40 ghế (A-C: Standard, D: VIP, E: Couple)
INSERT INTO `seats` (`hall_id`, `seat_row`, `seat_number`, `seat_type`, `status`) VALUES
-- Hàng A (Standard)
(1, 'A', 1, 'standard', 'active'), (1, 'A', 2, 'standard', 'active'), (1, 'A', 3, 'standard', 'active'), (1, 'A', 4, 'standard', 'active'),
(1, 'A', 5, 'standard', 'active'), (1, 'A', 6, 'standard', 'active'), (1, 'A', 7, 'standard', 'active'), (1, 'A', 8, 'standard', 'active'),
-- Hàng B (Standard)
(1, 'B', 1, 'standard', 'active'), (1, 'B', 2, 'standard', 'active'), (1, 'B', 3, 'standard', 'active'), (1, 'B', 4, 'standard', 'active'),
(1, 'B', 5, 'standard', 'active'), (1, 'B', 6, 'standard', 'active'), (1, 'B', 7, 'standard', 'active'), (1, 'B', 8, 'standard', 'active'),
-- Hàng C (Standard)
(1, 'C', 1, 'standard', 'active'), (1, 'C', 2, 'standard', 'active'), (1, 'C', 3, 'standard', 'active'), (1, 'C', 4, 'standard', 'active'),
(1, 'C', 5, 'standard', 'active'), (1, 'C', 6, 'standard', 'active'), (1, 'C', 7, 'standard', 'active'), (1, 'C', 8, 'standard', 'active'),
-- Hàng D (VIP)
(1, 'D', 1, 'vip', 'active'), (1, 'D', 2, 'vip', 'active'), (1, 'D', 3, 'vip', 'active'), (1, 'D', 4, 'vip', 'active'),
(1, 'D', 5, 'vip', 'active'), (1, 'D', 6, 'vip', 'active'), (1, 'D', 7, 'vip', 'active'), (1, 'D', 8, 'vip', 'active'),
-- Hàng E (Couple)
(1, 'E', 1, 'couple', 'active'), (1, 'E', 2, 'couple', 'active'), (1, 'E', 3, 'couple', 'active'), (1, 'E', 4, 'couple', 'active');

-- Hall 2 (IMAX Hall 2): 30 ghế mẫu (A-C: VIP, D: Couple)
INSERT INTO `seats` (`hall_id`, `seat_row`, `seat_number`, `seat_type`, `status`) VALUES
(2, 'A', 1, 'vip', 'active'), (2, 'A', 2, 'vip', 'active'), (2, 'A', 3, 'vip', 'active'), (2, 'A', 4, 'vip', 'active'), (2, 'A', 5, 'vip', 'active'), (2, 'A', 6, 'vip', 'active'),
(2, 'B', 1, 'vip', 'active'), (2, 'B', 2, 'vip', 'active'), (2, 'B', 3, 'vip', 'active'), (2, 'B', 4, 'vip', 'active'), (2, 'B', 5, 'vip', 'active'), (2, 'B', 6, 'vip', 'active'),
(2, 'C', 1, 'couple', 'active'), (2, 'C', 2, 'couple', 'active'), (2, 'C', 3, 'couple', 'active');

-- Hall 3 (VIP Hall 3): 16 ghế VIP và Couple
INSERT INTO `seats` (`hall_id`, `seat_row`, `seat_number`, `seat_type`, `status`) VALUES
(3, 'A', 1, 'vip', 'active'), (3, 'A', 2, 'vip', 'active'), (3, 'A', 3, 'vip', 'active'), (3, 'A', 4, 'vip', 'active'),
(3, 'B', 1, 'vip', 'active'), (3, 'B', 2, 'vip', 'active'), (3, 'B', 3, 'vip', 'active'), (3, 'B', 4, 'vip', 'active'),
(3, 'C', 1, 'couple', 'active'), (3, 'C', 2, 'couple', 'active');

-- 7. Seed Showtimes
INSERT INTO `showtimes` (`id`, `movie_event_id`, `hall_id`, `start_time`, `end_time`, `price_standard`, `price_vip`, `price_couple`, `status`) VALUES
(1, 1, 1, '2026-10-01 18:30:00', '2026-10-01 21:15:00', 80000.00, 100000.00, 180000.00, 'scheduled'),
(2, 1, 2, '2026-10-01 20:00:00', '2026-10-01 22:45:00', 120000.00, 150000.00, 260000.00, 'scheduled'),
(3, 2, 1, '2026-10-01 09:30:00', '2026-10-01 11:05:00', 70000.00, 90000.00, 160000.00, 'scheduled'),
(4, 3, 3, '2026-10-01 21:00:00', '2026-10-01 23:15:00', 100000.00, 130000.00, 220000.00, 'scheduled');

-- 8. Seed Sample Bookings & Booking Seats
INSERT INTO `bookings` (`id`, `user_id`, `booking_code`, `showtime_id`, `customer_name`, `customer_email`, `customer_phone`, `total_amount`, `payment_status`, `payment_method`, `qr_code`) VALUES
(1, 2, 'BK-2026-DUNE01', 1, 'Nguyễn Văn An', 'an.nguyen@example.com', '0901234567', 200000.00, 'paid', 'mock_vnpay', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BK-2026-DUNE01');

-- Seed Booking Seats (Ghế D3 và D4 của Showtime 1 đã bán)
INSERT INTO `booking_seats` (`booking_id`, `showtime_id`, `seat_id`, `price`) VALUES
(1, 1, 27, 100000.00), -- Seat ID 27 là D3 của Hall 1
(1, 1, 28, 100000.00); -- Seat ID 28 là D4 của Hall 1
