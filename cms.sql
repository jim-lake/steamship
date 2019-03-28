
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cms`
--

-- --------------------------------------------------------

--
-- Table structure for table `app`
--

CREATE TABLE `app` (
  `app_id` int(11) NOT NULL,
  `app_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `app_resource`
--

CREATE TABLE `app_resource` (
  `app_resource_id` int(11) NOT NULL,
  `app_ver_id` int(11) NOT NULL,
  `filename` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `content_type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `file_contents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `app_ver`
--

CREATE TABLE `app_ver` (
  `app_ver_id` int(11) NOT NULL,
  `app_id` int(11) NOT NULL,
  `version` varchar(64) COLLATE utf8_unicode_ci NOT NULL,
  `version_hash` varchar(64) COLLATE utf8_unicode_ci NOT NULL,
  `s3_path` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `tag` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site`
--

CREATE TABLE `site` (
  `site_id` int(11) NOT NULL,
  `site_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `site_config_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `s3_publish_url` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `is_disabled` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site_host`
--

CREATE TABLE `site_host` (
  `site_host_id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `hostname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hostname_regex` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site_path`
--

CREATE TABLE `site_path` (
  `site_path_id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `path_regex` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT '0',
  `app_resource_id` int(11) NOT NULL,
  `site_path_config_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `is_disabled` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `upload_token`
--

CREATE TABLE `upload_token` (
  `upload_token` varchar(64) COLLATE utf8_unicode_ci NOT NULL,
  `app_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `app`
--
ALTER TABLE `app`
  ADD PRIMARY KEY (`app_id`),
  ADD UNIQUE KEY `app_name` (`app_name`);

--
-- Indexes for table `app_resource`
--
ALTER TABLE `app_resource`
  ADD PRIMARY KEY (`app_resource_id`),
  ADD UNIQUE KEY `app_ver_id_2` (`app_ver_id`,`filename`),
  ADD KEY `app_ver_id` (`app_ver_id`);

--
-- Indexes for table `app_ver`
--
ALTER TABLE `app_ver`
  ADD PRIMARY KEY (`app_ver_id`),
  ADD UNIQUE KEY `app_id_2` (`app_id`,`version`),
  ADD KEY `app_id` (`app_id`);

--
-- Indexes for table `site`
--
ALTER TABLE `site`
  ADD PRIMARY KEY (`site_id`);

--
-- Indexes for table `site_host`
--
ALTER TABLE `site_host`
  ADD PRIMARY KEY (`site_host_id`),
  ADD UNIQUE KEY `hostname` (`hostname`),
  ADD KEY `site_id` (`site_id`);

--
-- Indexes for table `site_path`
--
ALTER TABLE `site_path`
  ADD PRIMARY KEY (`site_path_id`),
  ADD UNIQUE KEY `site_id` (`site_id`,`path_regex`),
  ADD UNIQUE KEY `site_id_2` (`site_id`,`path`),
  ADD KEY `app_resource_id` (`app_resource_id`);

--
-- Indexes for table `upload_token`
--
ALTER TABLE `upload_token`
  ADD PRIMARY KEY (`upload_token`),
  ADD KEY `app_id` (`app_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `app`
--
ALTER TABLE `app`
  MODIFY `app_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
--
-- AUTO_INCREMENT for table `app_resource`
--
ALTER TABLE `app_resource`
  MODIFY `app_resource_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=157;
--
-- AUTO_INCREMENT for table `app_ver`
--
ALTER TABLE `app_ver`
  MODIFY `app_ver_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;
--
-- AUTO_INCREMENT for table `site`
--
ALTER TABLE `site`
  MODIFY `site_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT for table `site_host`
--
ALTER TABLE `site_host`
  MODIFY `site_host_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
--
-- AUTO_INCREMENT for table `site_path`
--
ALTER TABLE `site_path`
  MODIFY `site_path_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;
--
-- Constraints for dumped tables
--

--
-- Constraints for table `app_resource`
--
ALTER TABLE `app_resource`
  ADD CONSTRAINT `app_resource_ibfk_1` FOREIGN KEY (`app_ver_id`) REFERENCES `app_ver` (`app_ver_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `app_ver`
--
ALTER TABLE `app_ver`
  ADD CONSTRAINT `app_ver_ibfk_1` FOREIGN KEY (`app_id`) REFERENCES `app` (`app_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `site_host`
--
ALTER TABLE `site_host`
  ADD CONSTRAINT `site_host_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `site` (`site_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `site_path`
--
ALTER TABLE `site_path`
  ADD CONSTRAINT `site_path_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `site` (`site_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `site_path_ibfk_2` FOREIGN KEY (`app_resource_id`) REFERENCES `app_resource` (`app_resource_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `upload_token`
--
ALTER TABLE `upload_token`
  ADD CONSTRAINT `upload_token_ibfk_1` FOREIGN KEY (`app_id`) REFERENCES `app` (`app_id`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
