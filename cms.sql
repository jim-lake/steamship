SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

CREATE DATABASE IF NOT EXISTS `cms` DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci;
USE `cms`;

CREATE TABLE IF NOT EXISTS `app` (
  `app_id` int(11) NOT NULL AUTO_INCREMENT,
  `app_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`app_id`),
  UNIQUE KEY `app_name` (`app_name`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=2 ;

CREATE TABLE IF NOT EXISTS `app_resource` (
  `app_resource_id` int(11) NOT NULL AUTO_INCREMENT,
  `app_ver_id` int(11) NOT NULL,
  `filename` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `content_type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `file_contents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`app_resource_id`),
  UNIQUE KEY `app_ver_id_2` (`app_ver_id`,`filename`),
  KEY `app_ver_id` (`app_ver_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=12 ;

CREATE TABLE IF NOT EXISTS `app_ver` (
  `app_ver_id` int(11) NOT NULL AUTO_INCREMENT,
  `app_id` int(11) NOT NULL,
  `version` varchar(64) COLLATE utf8_unicode_ci NOT NULL,
  `version_hash` varchar(64) COLLATE utf8_unicode_ci NOT NULL,
  `s3_path` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `tag` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`app_ver_id`),
  UNIQUE KEY `app_id_2` (`app_id`,`version`),
  KEY `app_id` (`app_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=16 ;

CREATE TABLE IF NOT EXISTS `site` (
  `site_id` int(11) NOT NULL AUTO_INCREMENT,
  `site_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `site_config_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `is_disabled` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`site_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=2 ;

CREATE TABLE IF NOT EXISTS `site_host` (
  `site_host_id` int(11) NOT NULL AUTO_INCREMENT,
  `site_id` int(11) NOT NULL,
  `hostname` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `hostname_regex` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`site_host_id`),
  UNIQUE KEY `hostname` (`hostname`),
  KEY `site_id` (`site_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=3 ;

CREATE TABLE IF NOT EXISTS `site_path` (
  `site_path_id` int(11) NOT NULL AUTO_INCREMENT,
  `site_id` int(11) NOT NULL,
  `path_regex` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `priority` int(11) NOT NULL DEFAULT '0',
  `app_resource_id` int(11) NOT NULL,
  `site_path_config_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `is_disabled` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`site_path_id`),
  UNIQUE KEY `site_id` (`site_id`,`path_regex`),
  KEY `app_resource_id` (`app_resource_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=5 ;

CREATE TABLE IF NOT EXISTS `upload_token` (
  `upload_token` varchar(64) COLLATE utf8_unicode_ci NOT NULL,
  `app_id` int(11) NOT NULL,
  PRIMARY KEY (`upload_token`),
  KEY `app_id` (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


ALTER TABLE `app_resource`
  ADD CONSTRAINT `app_resource_ibfk_1` FOREIGN KEY (`app_ver_id`) REFERENCES `app_ver` (`app_ver_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `app_ver`
  ADD CONSTRAINT `app_ver_ibfk_1` FOREIGN KEY (`app_id`) REFERENCES `app` (`app_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `site_host`
  ADD CONSTRAINT `site_host_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `site` (`site_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `site_path`
  ADD CONSTRAINT `site_path_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `site` (`site_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `site_path_ibfk_2` FOREIGN KEY (`app_resource_id`) REFERENCES `app_resource` (`app_resource_id`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
