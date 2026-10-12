const db = require("./db.js");

async function initDb() {
  await db.query(`
        CREATE TABLE IF NOT EXISTS members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(128) UNIQUE NULL,
        name VARCHAR (100) NOT NULL,
        email VARCHAR (255) NOT NULL UNIQUE,
        password_hash VARCHAR (255)  NULL,
        photo_url VARCHAR (500)  NULL,
        phone VARCHAR (20) NULL UNIQUE,
        role ENUM('member','cashier','secretary','chairman','admin') NOT NULL DEFAULT 'member',
        status ENUM('pending','active','inactive') NOT NULL DEFAULT 'pending',
        joined_date DATE NULL
         )`);

  await db.query(`
          CREATE TABLE IF NOT EXISTS memories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          image_url VARCHAR (255) NOT NULL ,
          uploader VARCHAR (100) NOT NULL,
          uploader_email VARCHAR (255) NOT NULL ,
          uploader_photoURL VARCHAR (255) NOT NULL ,
          photo_info VARCHAR (300) NOT NULL ,
          uploaded_at DATETIME NOT NULL  
          )`);
}

module.exports = initDb;
