-- ============================================================================
-- Cinema & Event Booking System Database Schema (MySQL 8.0)
-- Phase 1 Skeleton & Initial Schema Definition
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `cinema_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cinema_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('user', 'admin') DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Categories table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('movie', 'event') NOT NULL DEFAULT 'movie',
  `description` VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Movies & Events table
CREATE TABLE IF NOT EXISTS `movies_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `duration_minutes` INT NOT NULL,
  `release_date` DATE NOT NULL,
  `poster_url` VARCHAR(255) DEFAULT NULL,
  `trailer_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('now_showing', 'coming_soon', 'ended') DEFAULT 'now_showing',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_movie_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Cinemas table
CREATE TABLE IF NOT EXISTS `cinemas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Halls (Phòng chiếu) table
CREATE TABLE IF NOT EXISTS `halls` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cinema_id` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `total_rows` INT NOT NULL DEFAULT 8,
  `total_cols` INT NOT NULL DEFAULT 12,
  `type` ENUM('2D', '3D', 'IMAX', 'VIP') DEFAULT '2D',
  CONSTRAINT `fk_hall_cinema` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Seats table
CREATE TABLE IF NOT EXISTS `seats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hall_id` INT NOT NULL,
  `seat_row` VARCHAR(5) NOT NULL,
  `seat_number` INT NOT NULL,
  `seat_type` ENUM('standard', 'vip', 'couple') DEFAULT 'standard',
  `status` ENUM('active', 'maintenance') DEFAULT 'active',
  UNIQUE KEY `unique_seat_in_hall` (`hall_id`, `seat_row`, `seat_number`),
  CONSTRAINT `fk_seat_hall` FOREIGN KEY (`hall_id`) REFERENCES `halls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Showtimes table
CREATE TABLE IF NOT EXISTS `showtimes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `movie_event_id` INT NOT NULL,
  `hall_id` INT NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `price_standard` DECIMAL(10,2) NOT NULL DEFAULT 70000.00,
  `price_vip` DECIMAL(10,2) NOT NULL DEFAULT 90000.00,
  `price_couple` DECIMAL(10,2) NOT NULL DEFAULT 150000.00,
  `status` ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
  INDEX `idx_showtime_search` (`movie_event_id`, `start_time`),
  CONSTRAINT `fk_showtime_movie` FOREIGN KEY (`movie_event_id`) REFERENCES `movies_events` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_showtime_hall` FOREIGN KEY (`hall_id`) REFERENCES `halls` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Seat Locks table (Cơ chế giữ ghế TTL 5 phút chống race condition)
CREATE TABLE IF NOT EXISTS `seat_locks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `showtime_id` INT NOT NULL,
  `seat_id` INT NOT NULL,
  `session_id` VARCHAR(100) NOT NULL,
  `locked_until` TIMESTAMP NOT NULL,
  UNIQUE KEY `unique_seat_lock` (`showtime_id`, `seat_id`),
  CONSTRAINT `fk_lock_showtime` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lock_seat` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bookings table
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `booking_code` VARCHAR(32) NOT NULL UNIQUE,
  `showtime_id` INT NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_email` VARCHAR(100) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `payment_status` ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
  `payment_method` VARCHAR(50) DEFAULT 'mock_vnpay',
  `qr_code` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_booking_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_booking_showtime` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Booking Seats table (TRỌNG YẾU: Chống Double Booking ở tầng vật lý Database)
CREATE TABLE IF NOT EXISTS `booking_seats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL,
  `showtime_id` INT NOT NULL,
  `seat_id` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  UNIQUE KEY `unique_showtime_seat` (`showtime_id`, `seat_id`),
  CONSTRAINT `fk_bs_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bs_showtime` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_bs_seat` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
